import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getPagination, getSortOrder, sortRows, paginateRows } from '../utils/pagination.js';
import { LEAD_STATUSES, normalizeLeadStatus, canAccessAllLeads } from '../constants/lead.constants.js';
import { CONNECT_STATUSES, normalizeConnectStatus } from '../constants/connect.constants.js';

/**
 * All report endpoints below accept the same server-side query contract:
 *
 *   page, limit        → pagination (limit is capped)
 *   search             → case-insensitive text search over the report columns
 *   <entity filters>   → e.g. status, source, type, role, industry, reason
 *   sortBy, sortOrder  → any column shown in the report UI
 *
 * The response is `{ data: [page rows], meta: { total, page, limit, totalPages },
 * filters: { <dropdown options> } }` so the UI never re-fetches or re-processes
 * the full dataset.
 */

// ──────────────────────────────────────────────────────────────────────────
// Dashboard KPIs (unchanged)
// ──────────────────────────────────────────────────────────────────────────

export const getDashboardSummary = async (req, res, next) => {
  try {
    const [
      totalLeads,
      unassignedLeads,
      wonLeads,
      scheduledMeetings,
      openProposals,
      activeClients,
      revenueAggregate
    ] = await Promise.all([
      prisma.lead.count({ where: { deletedAt: null } }),
      prisma.lead.count({ where: { deletedAt: null, assignedToId: null } }),
      prisma.lead.count({ where: { deletedAt: null, status: 'WON' } }),
      prisma.meeting.count({ where: { status: 'SCHEDULED' } }),
      prisma.proposal.count({ where: { status: 'Sent' } }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.proposal.aggregate({
        where: { status: { in: ['Accepted', 'Won'] } },
        _sum: { amount: true }
      })
    ]);

    const totalWonRevenue = revenueAggregate._sum.amount || 0;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(2) : 0;

    const summary = {
      totalLeads,
      unassignedLeads,
      wonLeads,
      scheduledMeetings,
      openProposals,
      activeClients,
      totalWonRevenue,
      conversionRate: `${conversionRate}%`
    };

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Dashboard KPIs retrieved successfully', summary)
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Dashboard charts (lead trend + conversion), aggregated by month
// ──────────────────────────────────────────────────────────────────────────

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short' });

const buildMonthBuckets = (count) => {
  const buckets = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: MONTH_LABEL_FORMAT.format(d) });
  }
  return buckets;
};

export const getDashboardCharts = async (req, res, next) => {
  try {
    const leadBuckets = buildMonthBuckets(12);
    const conversionBuckets = leadBuckets.slice(-6);

    const startDate = new Date(leadBuckets[0].key);

    const [leadRows, conversionRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
        FROM leads
        WHERE deleted_at IS NULL AND created_at >= ${startDate}
        GROUP BY month
        ORDER BY month ASC
      `,
      prisma.$queryRaw`
        SELECT to_char(created_at, 'YYYY-MM') AS month, status, COUNT(*)::int AS count
        FROM leads
        WHERE deleted_at IS NULL
          AND status IN ('WON', 'LOST')
          AND created_at >= ${startDate}
        GROUP BY month, status
        ORDER BY month ASC
      `
    ]);

    const leadCountByMonth = new Map(leadRows.map((r) => [r.month, Number(r.count) || 0]));
    const wonByMonth = new Map();
    const lostByMonth = new Map();
    for (const row of conversionRows) {
      const count = Number(row.count) || 0;
      if (row.status === 'WON') wonByMonth.set(row.month, count);
      if (row.status === 'LOST') lostByMonth.set(row.month, count);
    }

    const chartData = {
      leadTrend: {
        categories: leadBuckets.map((b) => b.label),
        series: leadBuckets.map((b) => leadCountByMonth.get(b.key) || 0)
      },
      conversion: {
        categories: conversionBuckets.map((b) => b.label),
        won: conversionBuckets.map((b) => wonByMonth.get(b.key) || 0),
        lost: conversionBuckets.map((b) => lostByMonth.get(b.key) || 0)
      }
    };

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Dashboard charts retrieved successfully', chartData)
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────

const LEAD_SORT_FIELDS = {
  id: (l) => l.id,
  company: (l) => l.title,
  contactPerson: (l) => l.contactPerson,
  email: (l) => l.email,
  phone: (l) => l.phone || '',
  source: (l) => l.source?.name || '',
  industry: (l) => l.industry?.name || '',
  status: (l) => l.status,
  assignedTo: (l) => l.assignedTo?.name || 'Unassigned',
  createdAt: (l) => l.createdAt
};

// Mirrors the client-side getMeetingType logic exactly: a meeting is "Offline"
// when it has no link or the link is not an http(s) URL, otherwise the type is
// derived from the provider hostname.
const MEETING_TYPE_CONDITIONS = {
  Offline: {
    OR: [
      { meetingLink: null },
      { meetingLink: '' },
      { meetingLink: { NOT: { startsWith: 'http' } } }
    ]
  },
  'Google Meet': {
    meetingLink: {
      AND: [
        { startsWith: 'http' },
        { contains: 'meet.google.com', mode: 'insensitive' }
      ]
    }
  },
  Zoom: {
    meetingLink: {
      AND: [{ startsWith: 'http' }, { contains: 'zoom.us', mode: 'insensitive' }]
    }
  },
  'Microsoft Teams': {
    meetingLink: {
      AND: [
        { startsWith: 'http' },
        {
          OR: [
            { contains: 'teams.microsoft.com', mode: 'insensitive' },
            { contains: 'teams.live.com', mode: 'insensitive' }
          ]
        }
      ]
    }
  },
  Online: {
    meetingLink: {
      AND: [
        { startsWith: 'http' },
        {
          NOT: [
            { contains: 'meet.google.com', mode: 'insensitive' },
            { contains: 'zoom.us', mode: 'insensitive' },
            { contains: 'teams.microsoft.com', mode: 'insensitive' },
            { contains: 'teams.live.com', mode: 'insensitive' }
          ]
        }
      ]
    }
  }
};

const MEETING_STATUS_LABELS = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  RESCHEDULED: 'RESCHEDULED',
  CANCELLED: 'CANCELLED',
  Scheduled: 'SCHEDULED',
  Completed: 'COMPLETED',
  Rescheduled: 'RESCHEDULED',
  Cancelled: 'CANCELLED'
};

const normalizeMeetingStatus = (value) => {
  if (!value) return null;
  const normalized = String(value).trim();
  return MEETING_STATUS_LABELS[normalized] || null;
};

const getMeetingType = (link) => {
  if (!link) return 'Offline';
  const trimmed = String(link).trim();
  if (/^https?:\/\//i.test(trimmed)) {
    if (/meet\.google\.com/i.test(trimmed)) return 'Google Meet';
    if (/zoom\.us/i.test(trimmed)) return 'Zoom';
    if (/teams\.(microsoft|live)\.com/i.test(trimmed)) return 'Microsoft Teams';
    return 'Online';
  }
  return 'Offline';
};

const USER_STATUS_MAP = { ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE', SUSPENDED: 'SUSPENDED' };

// ──────────────────────────────────────────────────────────────────────────
// Lead report
// ──────────────────────────────────────────────────────────────────────────

export const getLeadReport = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 200);
    const { search, status, source } = req.query;
    const sortBy = LEAD_SORT_FIELDS[req.query.sortBy] ? req.query.sortBy : 'id';
    const sortOrder = getSortOrder(req.query, 'asc');

    const where = { deletedAt: null };
    if (status) {
      const normalized = normalizeLeadStatus(status) || status;
      where.status = normalized;
    }
    if (source) {
      where.source = { name: { equals: source, mode: 'insensitive' } };
    }
    if (search) {
      where.OR = [
        { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
        { title: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { alternatePhone: { contains: search, mode: 'insensitive' } },
        { alternateEmail: { contains: search, mode: 'insensitive' } },
        { website: { contains: search, mode: 'insensitive' } },
        { companyType: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { pincode: { contains: search, mode: 'insensitive' } },
        { requirements: { contains: search, mode: 'insensitive' } },
        ...(normalizeLeadStatus(search) ? [{ status: normalizeLeadStatus(search) }] : []),
        { assignedTo: { name: { contains: search, mode: 'insensitive' } } },
        { source: { name: { contains: search, mode: 'insensitive' } } },
        { priority: { name: { contains: search, mode: 'insensitive' } } },
        { industry: { name: { contains: search, mode: 'insensitive' } } },
        { country: { name: { contains: search, mode: 'insensitive' } } },
        { state: { name: { contains: search, mode: 'insensitive' } } },
        { city: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    // Keep parity with the leads list endpoint: non-managers only see their own leads.
    if (!canAccessAllLeads(req.user)) {
      where.assignedToId = req.user.id;
    }

    const [leads, sourceItems] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          title: true,
          contactPerson: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          source: { select: { name: true } },
          industry: { select: { name: true } },
          assignedTo: { select: { name: true } }
        }
      }),
      prisma.masterItem.findMany({
        where: { category: 'LEAD_SOURCE', status: 'Active' },
        select: { name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const sorted = sortRows(leads, LEAD_SORT_FIELDS[sortBy], sortOrder);
    const { data, total, totalPages } = paginateRows(sorted, page, limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead report retrieved successfully', data, {
        total,
        page,
        limit,
        totalPages,
        filters: {
          statuses: LEAD_STATUSES,
          sources: sourceItems.map((s) => s.name)
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Meeting report
// ──────────────────────────────────────────────────────────────────────────

const MEETING_SORT_FIELDS = {
  id: (m) => m.id,
  subject: (m) => m.title,
  company: (m) => m.lead?.title || '',
  contactPerson: (m) => m.lead?.contactPerson || '',
  date: (m) => m.scheduledAt,
  time: (m) => m.scheduledAt,
  type: (m) => getMeetingType(m.meetingLink),
  status: (m) => m.status,
  createdBy: (m) => m.createdBy?.name || ''
};

export const getMeetingReport = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 200);
    const { search, status, type } = req.query;
    const sortBy = MEETING_SORT_FIELDS[req.query.sortBy] ? req.query.sortBy : 'date';
    const sortOrder = getSortOrder(req.query, 'asc');

    const where = {};
    if (status) {
      const normalized = normalizeMeetingStatus(status);
      if (normalized) where.status = normalized;
    }
    if (type) {
      const typeCondition = MEETING_TYPE_CONDITIONS[type];
      if (typeCondition) Object.assign(where, typeCondition);
    }
    if (search) {
      where.OR = [
        { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
        { title: { contains: search, mode: 'insensitive' } },
        { agenda: { contains: search, mode: 'insensitive' } },
        { scopeNotes: { contains: search, mode: 'insensitive' } },
        { actionSummary: { contains: search, mode: 'insensitive' } },
        ...(normalizeMeetingStatus(search) ? [{ status: normalizeMeetingStatus(search) }] : []),
        ...(normalizeLeadStatus(search) ? [{ lead: { status: normalizeLeadStatus(search) } }] : []),
        { lead: { id: Number.isInteger(Number(search)) ? Number(search) : -1 } },
        { lead: { title: { contains: search, mode: 'insensitive' } } },
        { lead: { contactPerson: { contains: search, mode: 'insensitive' } } },
        { lead: { email: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search, mode: 'insensitive' } } },
        { createdBy: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        lead: { select: { id: true, title: true, contactPerson: true } },
        createdBy: { select: { id: true, name: true } }
      }
    });

    const sorted = sortRows(meetings, MEETING_SORT_FIELDS[sortBy], sortOrder);
    const { data, total, totalPages } = paginateRows(sorted, page, limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Meeting report retrieved successfully', data, {
        total,
        page,
        limit,
        totalPages,
        filters: {
          statuses: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED'],
          types: ['Offline', 'Google Meet', 'Zoom', 'Microsoft Teams', 'Online']
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Employee report
// ──────────────────────────────────────────────────────────────────────────

const EMPLOYEE_SORT_FIELDS = {
  id: (u) => u.id,
  name: (u) => u.name,
  email: (u) => u.email,
  phone: (u) => u.phone || '',
  role: (u) => u.role?.name || '',
  status: (u) => u.status,
  totalLeads: (u) => u.totalLeads,
  wonLeads: (u) => u.wonLeads,
  lostLeads: (u) => u.lostLeads
};

export const getEmployeeReport = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 200);
    const { search, status, role } = req.query;
    const sortBy = EMPLOYEE_SORT_FIELDS[req.query.sortBy] ? req.query.sortBy : 'id';
    const sortOrder = getSortOrder(req.query, 'asc');

    const andConditions = [
      // The seeded System Administrator account is not an employee and is
      // excluded from the employee report.
      { name: { not: 'System Administrator' } },
      { role: { name: { not: 'System Administrator' } } }
    ];
    if (status) {
      const normalized = USER_STATUS_MAP[String(status).trim().toUpperCase()];
      if (normalized) andConditions.push({ status: normalized });
    }
    if (role) {
      andConditions.push({ role: { name: { equals: role, mode: 'insensitive' } } });
    }
    if (search) {
      andConditions.push({
        OR: [
          { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } },
          ...(USER_STATUS_MAP[String(search).trim().toUpperCase()]
            ? [{ status: USER_STATUS_MAP[String(search).trim().toUpperCase()] }]
            : []),
          { role: { name: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    const where = { deletedAt: null, AND: andConditions };

    const [employeeStats, leadStats] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          role: { select: { name: true } },
          _count: {
            select: {
              assignedLeads: { where: { deletedAt: null } },
              createdMeetings: true,
              createdProposals: true
            }
          }
        }
      }),
      prisma.lead.groupBy({
        by: ['assignedToId', 'status'],
        where: { deletedAt: null },
        _count: { id: true }
      })
    ]);

    // Aggregate won / lost lead counts per user from the lead statistics.
    const totals = new Map();
    const wonCounts = new Map();
    const lostCounts = new Map();
    for (const row of leadStats) {
      const userId = row.assignedToId;
      if (userId == null) continue;
      totals.set(userId, (totals.get(userId) || 0) + row._count.id);
      if (row.status === 'WON') wonCounts.set(userId, row._count.id);
      if (row.status === 'LOST') lostCounts.set(userId, row._count.id);
    }

    const enriched = employeeStats.map((u) => ({
      ...u,
      totalLeads: totals.get(u.id) ?? 0,
      wonLeads: wonCounts.get(u.id) || 0,
      lostLeads: lostCounts.get(u.id) || 0
    }));

    const sorted = sortRows(enriched, EMPLOYEE_SORT_FIELDS[sortBy], sortOrder);
    const { data, total, totalPages } = paginateRows(sorted, page, limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Employee performance report retrieved successfully', data, {
        total,
        page,
        limit,
        totalPages,
        filters: {
          statuses: Array.from(new Set(enriched.map((u) => u.status))).sort(),
          roles: Array.from(new Set(enriched.map((u) => u.role?.name).filter(Boolean))).sort()
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Client report
// ──────────────────────────────────────────────────────────────────────────

const CLIENT_SORT_FIELDS = {
  id: (c) => c.id,
  companyName: (c) => c.company?.name || '',
  contactName: (c) => c.lead?.contactPerson || '',
  email: (c) => c.lead?.email || c.company?.email || '',
  phone: (c) => c.lead?.phone || c.company?.phone || '',
  industry: (c) => c.company?.industry?.name || '',
  status: (c) => c.status,
  clientSince: (c) => c.createdAt,
  projectsCount: (c) => c.projects?.length || 0,
  handoverStatus: (c) => (c.projects && c.projects.length > 0 ? 'Onboarded' : 'Pending'),
  paymentTerms: (c) => c.paymentTerms || '',
  creditLimit: (c) => (c.creditLimit != null ? Number(c.creditLimit) : -1)
};

export const getClientReport = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 200);
    const { search, status, industry, handover } = req.query;
    const sortBy = CLIENT_SORT_FIELDS[req.query.sortBy] ? req.query.sortBy : 'id';
    const sortOrder = getSortOrder(req.query, 'asc');

    const where = { deletedAt: null };
    if (status) where.status = status;
    if (industry) {
      where.company = { industry: { name: { equals: industry, mode: 'insensitive' } } };
    }
    if (handover) {
      where.projects = handover === 'Onboarded' ? { some: {} } : { none: {} };
    }
    if (search) {
      where.OR = [
        { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { company: { website: { contains: search, mode: 'insensitive' } } },
        { company: { email: { contains: search, mode: 'insensitive' } } },
        { company: { phone: { contains: search, mode: 'insensitive' } } },
        { company: { address: { contains: search, mode: 'insensitive' } } },
        { company: { pincode: { contains: search, mode: 'insensitive' } } },
        { company: { companyType: { contains: search, mode: 'insensitive' } } },
        { company: { industry: { name: { contains: search, mode: 'insensitive' } } } },
        { lead: { title: { contains: search, mode: 'insensitive' } } },
        { lead: { contactPerson: { contains: search, mode: 'insensitive' } } },
        { lead: { email: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search, mode: 'insensitive' } } },
        { gstPan: { contains: search, mode: 'insensitive' } },
        { panNumber: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { paymentTerms: { contains: search, mode: 'insensitive' } },
        { relationshipManager: { name: { contains: search, mode: 'insensitive' } } },
        { accountManager: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [clients, industryItems] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          company: {
            select: { name: true, email: true, phone: true, industry: { select: { name: true } } }
          },
          lead: { select: { contactPerson: true, email: true, phone: true } },
          relationshipManager: { select: { name: true } },
          accountManager: { select: { name: true } },
          projects: { select: { id: true } }
        }
      }),
      prisma.masterItem.findMany({
        where: { category: 'INDUSTRY', status: 'Active' },
        select: { name: true },
        orderBy: { name: 'asc' }
      })
    ]);

    const sorted = sortRows(clients, CLIENT_SORT_FIELDS[sortBy], sortOrder);
    const { data, total, totalPages } = paginateRows(sorted, page, limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Client report retrieved successfully', data, {
        total,
        page,
        limit,
        totalPages,
        filters: {
          statuses: Array.from(new Set(clients.map((c) => c.status))).filter(Boolean).sort(),
          industries: industryItems.map((i) => i.name),
          handoverStatuses: ['Pending', 'Onboarded']
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Proposal report
// ──────────────────────────────────────────────────────────────────────────

const PROPOSAL_SORT_FIELDS = {
  id: (p) => p.id,
  proposalNo: (p) => p.proposalNumber,
  leadName: (p) => p.lead?.contactPerson || '',
  companyName: (p) => p.lead?.title || '',
  leadEmail: (p) => p.lead?.email || '',
  leadPhone: (p) => p.lead?.phone || '',
  status: (p) => p.status,
  createdAt: (p) => p.createdAt,
  updatedAt: (p) => p.updatedAt,
  totalAmount: (p) => Number(p.amount) || 0,
  paymentTerms: (p) => p.quotation?.paymentTerms || '',
  deliveryTimeline: (p) => p.quotation?.deliveryTimeline || ''
};

export const getProposalReport = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 200);
    const { search, status } = req.query;
    const sortBy = PROPOSAL_SORT_FIELDS[req.query.sortBy] ? req.query.sortBy : 'id';
    const sortOrder = getSortOrder(req.query, 'asc');

    const where = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
        { proposalNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { lead: { id: Number.isInteger(Number(search)) ? Number(search) : -1 } },
        { lead: { title: { contains: search, mode: 'insensitive' } } },
        { lead: { contactPerson: { contains: search, mode: 'insensitive' } } },
        { lead: { email: { contains: search, mode: 'insensitive' } } },
        { lead: { phone: { contains: search, mode: 'insensitive' } } },
        { client: { company: { name: { contains: search, mode: 'insensitive' } } } },
        { client: { lead: { contactPerson: { contains: search, mode: 'insensitive' } } } },
        { createdBy: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [proposals, statusGroups] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          lead: { select: { id: true, title: true, contactPerson: true, email: true, phone: true } }
        }
      }),
      prisma.proposal.groupBy({ by: ['status'], _count: { _all: true } })
    ]);

    const sorted = sortRows(proposals, PROPOSAL_SORT_FIELDS[sortBy], sortOrder);
    const { data, total, totalPages } = paginateRows(sorted, page, limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Proposal report retrieved successfully', data, {
        total,
        page,
        limit,
        totalPages,
        filters: {
          statuses: statusGroups.map((g) => g.status).filter(Boolean).sort()
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Follow-up report
// ──────────────────────────────────────────────────────────────────────────

const FOLLOWUP_SORT_FIELDS = {
  id: (c) => c.id,
  company: (c) => c.company,
  contactPerson: (c) => c.contactPerson || '',
  date: (c) => c.followUpDate || '',
  time: (c) => c.followUpTime || '',
  reason: (c) => c.followUpType || '',
  status: (c) => c.status,
  outcome: (c) => c.outcome || '',
  assignedTo: (c) => c.assignedTo || ''
};

export const getFollowUpReport = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 200);
    const { search, status, reason } = req.query;
    const sortBy = FOLLOWUP_SORT_FIELDS[req.query.sortBy] ? req.query.sortBy : 'date';
    const sortOrder = getSortOrder(req.query, 'asc');

    const where = { deletedAt: null };
    if (status) {
      const normalized = normalizeConnectStatus(status) || status;
      where.status = normalized;
    }
    if (reason) where.followUpType = reason;

    // The report only lists follow-ups that have a scheduled date; empty
    // strings are treated the same as missing dates.
    const andConditions = [
      { followUpDate: { not: null } },
      { followUpDate: { not: '' } }
    ];
    if (search) {
      andConditions.push({
        OR: [
          { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
          { leadId: Number.isInteger(Number(search)) ? Number(search) : -1 },
          { company: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { assignedTo: { contains: search, mode: 'insensitive' } },
          { outcome: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
          { followUpType: { contains: search, mode: 'insensitive' } },
          { followUpDate: { contains: search, mode: 'insensitive' } },
          { followUpTime: { contains: search, mode: 'insensitive' } },
          { status: { contains: search, mode: 'insensitive' } }
        ]
      });
    }
    // Keep parity with the connect list endpoint: non-managers only see
    // follow-ups for leads assigned to them.
    if (!canAccessAllLeads(req.user)) {
      andConditions.push({ lead: { assignedToId: req.user.id } });
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const connects = await prisma.connect.findMany({
      where,
      select: {
        id: true,
        company: true,
        contactPerson: true,
        followUpDate: true,
        followUpTime: true,
        followUpType: true,
        status: true,
        outcome: true,
        assignedTo: true
      }
    });

    const sorted = sortRows(connects, FOLLOWUP_SORT_FIELDS[sortBy], sortOrder);
    const { data, total, totalPages } = paginateRows(sorted, page, limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Follow-up report retrieved successfully', data, {
        total,
        page,
        limit,
        totalPages,
        filters: {
          statuses: CONNECT_STATUSES,
          reasons: Array.from(new Set(connects.map((c) => c.followUpType).filter(Boolean))).sort()
        }
      })
    );
  } catch (error) {
    next(error);
  }
};
