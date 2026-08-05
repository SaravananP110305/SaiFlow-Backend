import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { writeAuditLog } from '../utils/auditLog.js';
import {
  canAccessAllLeads,
  isLegalLeadTransition,
  LEAD_TRANSITIONS
} from '../constants/lead.constants.js';
import {
  CONNECT_OUTCOME_LEAD_STATUS,
  normalizeConnectStatus
} from '../constants/connect.constants.js';

const getIp = (req) => req.ip || req.socket?.remoteAddress || null;

/** Managers may manage connects for any lead; otherwise only the assigned owner can. */
const assertCanManageLead = (req, lead) => {
  if (canAccessAllLeads(req.user)) return;
  if (lead.assignedToId !== req.user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only manage connects for leads assigned to you');
  }
};

/** Applies an outcome-driven lead status transition if valid, returns new status or null. */
const resolveLeadStatusForOutcome = (lead, outcome) => {
  if (!outcome) return null;
  const target = CONNECT_OUTCOME_LEAD_STATUS[outcome];
  if (!target || target === lead.status) return null;
  if (!isLegalLeadTransition(lead.status, target)) {
    const allowed = (LEAD_TRANSITIONS[lead.status] || []).join(', ');
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Cannot move lead from '${lead.status}' to '${target}'. Allowed transitions: ${allowed}`
    );
  }
  return target;
};

const leadWithAssignee = {
  assignedTo: { select: { id: true, name: true } }
};

// ──────────────────────────────────────────────────────────────────────────
// Read
// ──────────────────────────────────────────────────────────────────────────

export const getConnects = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 200);
    const skip = (page - 1) * limit;
    const { status, search, leadId } = req.query;

    const where = { deletedAt: null };
    if (leadId) where.leadId = parseInt(leadId, 10);
    if (status) where.status = normalizeConnectStatus(status) || status;
    if (search) {
      where.AND = [
        {
          OR: [
            { company: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { assignedTo: { contains: search, mode: 'insensitive' } },
            { summary: { contains: search, mode: 'insensitive' } }
          ]
        }
      ];
    }

    // Non-manager roles only see connects for leads assigned to them.
    if (!canAccessAllLeads(req.user)) {
      where.AND = [...(where.AND || []), { lead: { assignedToId: req.user.id } }];
    }

    const [total, connects] = await Promise.all([
      prisma.connect.count({ where }),
      prisma.connect.findMany({
        where,
        include: {
          lead: { select: { id: true, title: true, status: true } },
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: [{ followUpDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Connects retrieved successfully', connects, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Write
// ──────────────────────────────────────────────────────────────────────────

/**
 * Creates a connect record (contact outcome / scheduled follow-up) for a lead.
 * Denormalizes the lead display fields onto the row and, when the outcome maps
 * to a lead status (e.g. INTERESTED -> QUALIFIED), transitions the lead in the
 * same transaction.
 */
export const createConnect = async (req, res, next) => {
  try {
    const { leadId, outcome, summary, followUpType, followUpDate, followUpTime, status } = req.body;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      include: leadWithAssignee
    });
    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }
    assertCanManageLead(req, lead);

    const leadStatus = resolveLeadStatusForOutcome(lead, outcome);

    const finalStatus =
      status || (outcome === 'CALL_LATER' ? 'SCHEDULED' : 'COMPLETED');

    const [connect] = await prisma.$transaction([
      prisma.connect.create({
        data: {
          leadId: lead.id,
          company: lead.title,
          contactPerson: lead.contactPerson || null,
          phone: lead.phone || null,
          assignedTo: lead.assignedTo?.name || 'Unassigned',
          outcome: outcome || null,
          summary: summary || null,
          followUpType: followUpType || null,
          followUpDate: followUpDate || null,
          followUpTime: followUpTime || null,
          status: finalStatus,
          createdById: req.user.id
        }
      }),
      ...(leadStatus
        ? [prisma.lead.update({ where: { id: lead.id }, data: { status: leadStatus } })]
        : [])
    ]);

    await writeAuditLog({
      userId: req.user.id,
      action: 'connect_created',
      entity: 'Lead',
      entityId: lead.id,
      payload: { connectId: connect.id, outcome, status: finalStatus, leadStatus },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Connect record created successfully', connect)
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Updates a connect record (reschedule / complete / outcome). When an outcome
 * is supplied, the mapped lead status transition is applied atomically too.
 */
export const updateConnect = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { outcome, summary, followUpType, followUpDate, followUpTime, status } = req.body;

    const existing = await prisma.connect.findFirst({
      where: { id, deletedAt: null }
    });
    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Connect record not found'));
    }

    const lead = await prisma.lead.findFirst({
      where: { id: existing.leadId, deletedAt: null },
      include: leadWithAssignee
    });
    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }
    assertCanManageLead(req, lead);

    const leadStatus = resolveLeadStatusForOutcome(lead, outcome);

    const [updated] = await prisma.$transaction([
      prisma.connect.update({
        where: { id },
        data: {
          ...(outcome !== undefined && { outcome: outcome || null }),
          ...(summary !== undefined && { summary: summary || null }),
          ...(followUpType !== undefined && { followUpType: followUpType || null }),
          ...(followUpDate !== undefined && { followUpDate: followUpDate || null }),
          ...(followUpTime !== undefined && { followUpTime: followUpTime || null }),
          ...(status !== undefined && { status })
        }
      }),
      ...(leadStatus
        ? [prisma.lead.update({ where: { id: lead.id }, data: { status: leadStatus } })]
        : [])
    ]);

    await writeAuditLog({
      userId: req.user.id,
      action: 'connect_updated',
      entity: 'Lead',
      entityId: lead.id,
      payload: { connectId: id, outcome, status, leadStatus },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Connect record updated successfully', updated)
    );
  } catch (error) {
    next(error);
  }
};
