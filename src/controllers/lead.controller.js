import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { writeAuditLog } from '../utils/auditLog.js';
import { importLeadRowSchema } from '../validators/lead.validator.js';
import {
  normalizeLeadStatus,
  isLegalLeadTransition,
  LEAD_TRANSITIONS,
  TERMINAL_STATUSES,
  CONVERTIBLE_STATUSES,
  canAccessAllLeads
} from '../constants/lead.constants.js';

const ALLOWED_SORT_FIELDS = ['id', 'createdAt', 'updatedAt', 'title', 'contactPerson', 'email', 'status'];
const MAX_EXPORT_ROWS = 10000;

const parseId = (value) => parseInt(value, 10);

const getIp = (req) => req.ip || req.socket?.remoteAddress || null;

const getSort = (req) => {
  const sortBy = ALLOWED_SORT_FIELDS.includes(req.query.sortBy) ? req.query.sortBy : 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
};

/**
 * Builds the Prisma `where` for lead queries, applying shared filters and
 * ownership scoping for non-manager roles.
 */
const buildLeadWhere = (req) => {
  const { search, status, sourceId, priorityId, assignedToId, companyId, createdFrom, createdTo } = req.query;

  const where = {
    deletedAt: null,
    ...(status && { status: normalizeLeadStatus(status) || status }),
    ...(sourceId && { sourceId: parseId(sourceId) }),
    ...(priorityId && { priorityId: parseId(priorityId) }),
    ...(assignedToId && { assignedToId: parseId(assignedToId) }),
    ...(companyId && { companyId: parseId(companyId) }),
    ...((createdFrom || createdTo) && {
      createdAt: {
        ...(createdFrom && { gte: new Date(createdFrom) }),
        ...(createdTo && { lte: new Date(createdTo) })
      }
    }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ]
    })
  };

  // Non-manager roles only see the leads assigned to them.
  if (!canAccessAllLeads(req.user)) {
    where.assignedToId = req.user.id;
  }

  return where;
};

/** Managers may edit any lead; otherwise only the assigned owner can. */
const assertCanEditLead = (req, lead) => {
  if (canAccessAllLeads(req.user)) return;
  if (lead.assignedToId !== req.user.id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You can only manage leads assigned to you');
  }
};

const leadInclude = {
  company: {
    select: { id: true, name: true, website: true, address: true, pincode: true }
  },
  source: { select: { id: true, name: true } },
  priority: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  assignedBy: { select: { id: true, name: true } }
};

const assertRelationExists = async (model, id, label, { softDeletable = true } = {}) => {
  if (!id) return;
  const where = softDeletable ? { id, deletedAt: null } : { id };
  const record = await prisma[model].findFirst({ where });
  if (!record) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `${label} does not exist`);
  }
};

const findDuplicateLead = async (email, excludeId) => {
  if (!email) return null;
  return prisma.lead.findFirst({
    where: {
      email: email.toLowerCase(),
      deletedAt: null,
      ...(excludeId && { id: { not: excludeId } })
    },
    select: { id: true, company: { select: { name: true } }, contactPerson: true, status: true }
  });
};

// ──────────────────────────────────────────────────────────────────────────
// Read
// ──────────────────────────────────────────────────────────────────────────

export const getLeads = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    const skip = (page - 1) * limit;
    const { sortBy, sortOrder } = getSort(req);
    const where = buildLeadWhere(req);

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          ...leadInclude,
          _count: { select: { meetings: true, proposals: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Leads retrieved successfully', leads, {
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

export const getLeadById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);

    // AuditLog is a generic entity/entityId table (no FK to Lead), so it cannot
    // be included as a relation; fetch it separately and attach it below.
    const [lead, auditLogsRaw] = await Promise.all([
      prisma.lead.findFirst({
        where: { id, deletedAt: null },
        include: {
          company: true,
          source: true,
          priority: true,
          assignedTo: { select: { id: true, name: true, email: true, phone: true } },
          assignedBy: { select: { id: true, name: true } },
          meetings: { orderBy: { scheduledAt: 'desc' } },
          proposals: { orderBy: { createdAt: 'desc' } },
          clients: { where: { deletedAt: null }, select: { id: true, status: true } }
        }
      }),
      prisma.auditLog.findMany({
        where: { entity: 'Lead', entityId: id },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } }
      })
    ]);

    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    assertCanEditLead(req, lead);

    // AuditLog.id is BigInt, which JSON.stringify cannot serialize; convert it
    // to a string so res.json() does not throw.
    const auditLogs = auditLogsRaw.map((log) => ({ ...log, id: String(log.id) }));

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead retrieved successfully', { ...lead, auditLogs })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Write
// ──────────────────────────────────────────────────────────────────────────

export const createLead = async (req, res, next) => {
  try {
    const {
      title,
      contactPerson,
      email,
      phone,
      companyId,
      sourceId,
      priorityId,
      assignedToId,
      budget,
      currency,
      status,
      requirements,
      designation,
      alternatePhone,
      alternateEmail,
      expectedCloseDate,
      nextFollowUpDate
    } = req.body;

    await Promise.all([
      assertRelationExists('company', companyId, 'Company'),
      assertRelationExists('masterItem', sourceId, 'Lead source', { softDeletable: false }),
      assertRelationExists('masterItem', priorityId, 'Priority', { softDeletable: false }),
      assertRelationExists('user', assignedToId, 'Assigned user')
    ]);

    const duplicate = await findDuplicateLead(email);
    if (duplicate) {
      return next(
        new ApiError(
          StatusCodes.CONFLICT,
          `A lead with email '${email}' already exists (Lead #${duplicate.id}). Duplicate leads are not allowed.`
        )
      );
    }

    const now = new Date();
    const isAssigned = !!assignedToId;
    let finalStatus = normalizeLeadStatus(status) || 'NEW';
    if (isAssigned && finalStatus === 'NEW') {
      finalStatus = 'ASSIGNED';
    }

    const lead = await prisma.lead.create({
      data: {
        title,
        contactPerson,
        email,
        phone,
        companyId,
        sourceId,
        priorityId,
        assignedToId,
        assignedAt: isAssigned ? now : null,
        assignedById: isAssigned ? req.user.id : null,
        budget,
        currency: currency || 'USD',
        status: finalStatus,
        requirements,
        designation,
        alternatePhone,
        alternateEmail,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        lastActivityAt: now
      },
      include: leadInclude
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_created',
      entity: 'Lead',
      entityId: lead.id,
      payload: { status: finalStatus, assignedToId, email },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Lead created successfully', lead)
    );
  } catch (error) {
    next(error);
  }
};

export const updateLead = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    assertCanEditLead(req, existing);

    const {
      title,
      contactPerson,
      email,
      phone,
      companyId,
      sourceId,
      priorityId,
      assignedToId,
      budget,
      currency,
      status,
      requirements,
      designation,
      alternatePhone,
      alternateEmail,
      expectedCloseDate,
      nextFollowUpDate,
      lostReason,
      wonAmount
    } = req.body;

    const changes = [];

    // State machine: reject illegal transitions
    const nextStatus = normalizeLeadStatus(status);
    if (nextStatus && nextStatus !== existing.status) {
      if (!isLegalLeadTransition(existing.status, nextStatus)) {
        const allowed = (LEAD_TRANSITIONS[existing.status] || []).join(', ');
        return next(
          new ApiError(
            StatusCodes.CONFLICT,
            `Cannot move lead from '${existing.status}' to '${nextStatus}'. Allowed transitions: ${allowed}`
          )
        );
      }

      // Terminal transitions (WON / LOST / DISQUALIFIED) require manager or lead owner authority
      if (TERMINAL_STATUSES.includes(nextStatus) && !canAccessAllLeads(req.user) && existing.assignedToId !== req.user.id) {
        return next(
          new ApiError(
            StatusCodes.FORBIDDEN,
            `Only the lead owner or a manager can mark a lead as '${nextStatus}'`
          )
        );
      }
      changes.push(`status: ${existing.status} -> ${nextStatus}`);
    }

    if (email && email.toLowerCase() !== existing.email) {
      const duplicate = await findDuplicateLead(email, id);
      if (duplicate) {
        return next(
          new ApiError(
            StatusCodes.CONFLICT,
            `A lead with email '${email}' already exists (Lead #${duplicate.id}).`
          )
        );
      }
      changes.push('email changed');
    }

    await Promise.all([
      assertRelationExists('company', companyId, 'Company'),
      assertRelationExists('masterItem', sourceId, 'Lead source', { softDeletable: false }),
      assertRelationExists('masterItem', priorityId, 'Priority', { softDeletable: false }),
      assertRelationExists('user', assignedToId, 'Assigned user')
    ]);

    const now = new Date();
    const assigneeChanged = assignedToId !== undefined && assignedToId !== existing.assignedToId;
    const autoAssigned = assigneeChanged && existing.status === 'NEW' && !!assignedToId;
    if (assigneeChanged) {
      changes.push(
        `assigned: ${existing.assignedToId || 'none'} -> ${assignedToId || 'none'}`
      );
    }

    const finalStatus = nextStatus || (autoAssigned ? 'ASSIGNED' : existing.status);
    const closedAt =
      TERMINAL_STATUSES.includes(finalStatus)
        ? existing.closedAt || now
        : null;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(companyId !== undefined && { companyId }),
        ...(sourceId !== undefined && { sourceId }),
        ...(priorityId !== undefined && { priorityId }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(assigneeChanged && { assignedAt: assignedToId ? now : null, assignedById: assignedToId ? req.user.id : null }),
        ...((nextStatus || autoAssigned) && { status: finalStatus }),
        ...(budget !== undefined && { budget }),
        ...(wonAmount !== undefined && { wonAmount }),
        ...(currency !== undefined && { currency }),
        ...(requirements !== undefined && { requirements }),
        ...(designation !== undefined && { designation }),
        ...(alternatePhone !== undefined && { alternatePhone }),
        ...(alternateEmail !== undefined && { alternateEmail }),
        ...(expectedCloseDate !== undefined && { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null }),
        ...(nextFollowUpDate !== undefined && { nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null }),
        ...(nextStatus && TERMINAL_STATUSES.includes(nextStatus)
          ? { lostReason: lostReason ?? requirements ?? existing.requirements ?? null }
          : { ...(lostReason !== undefined && { lostReason }) }),
        closedAt,
        lastActivityAt: now
      },
      include: leadInclude
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_updated',
      entity: 'Lead',
      entityId: id,
      payload: { changes: changes.length ? changes : ['fields updated'] },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead updated successfully', updated)
    );
  } catch (error) {
    next(error);
  }
};

export const assignLead = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const { assignedToId } = req.body;

    const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    assertCanEditLead(req, lead);

    const user = await prisma.user.findFirst({ where: { id: assignedToId, deletedAt: null, status: 'ACTIVE' } });
    if (!user) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Assigned user does not exist or is inactive'));
    }

    const now = new Date();
    const newStatus = lead.status === 'NEW' ? 'ASSIGNED' : lead.status;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        assignedToId,
        assignedAt: now,
        assignedById: req.user.id,
        status: newStatus,
        lastActivityAt: now
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } }
      }
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_assigned',
      entity: 'Lead',
      entityId: id,
      payload: { from: lead.assignedToId || null, to: assignedToId, assignee: user.name },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, `Lead assigned to ${user.name} successfully`, updated)
    );
  } catch (error) {
    next(error);
  }
};

export const deleteLead = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { clients: { where: { deletedAt: null }, select: { id: true } } }
    });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    assertCanEditLead(req, existing);

    if (existing.clients.length > 0) {
      return next(
        new ApiError(
          StatusCodes.CONFLICT,
          'This lead has been converted to a client and cannot be deleted.'
        )
      );
    }

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_deleted',
      entity: 'Lead',
      entityId: id,
      payload: { title: existing.title },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Aggregations & bulk operations
// ──────────────────────────────────────────────────────────────────────────

export const getLeadStatusCounts = async (req, res, next) => {
  try {
    const where = buildLeadWhere(req);

    const [grouped, total, wonValueAgg, pipelineAgg] = await Promise.all([
      prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.lead.count({ where }),
      prisma.lead.aggregate({
        where: { ...where, status: 'WON' },
        _sum: { wonAmount: true, budget: true }
      }),
      prisma.lead.aggregate({
        where: { ...where, status: { notIn: ['WON', 'LOST', 'DISQUALIFIED'] } },
        _sum: { budget: true }
      })
    ]);

    const counts = {};
    grouped.forEach((group) => {
      counts[group.status] = group._count._all;
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead status counts retrieved successfully', {
        counts,
        total,
        wonValue: wonValueAgg._sum.wonAmount || wonValueAgg._sum.budget || 0,
        pipelineValue: pipelineAgg._sum.budget || 0
      })
    );
  } catch (error) {
    next(error);
  }
};

export const bulkAssignLeads = async (req, res, next) => {
  try {
    const { ids, assignedToId } = req.body;

    const user = await prisma.user.findFirst({ where: { id: assignedToId, deletedAt: null, status: 'ACTIVE' } });
    if (!user) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Assigned user does not exist or is inactive'));
    }

    const where = { id: { in: ids }, deletedAt: null };
    if (!canAccessAllLeads(req.user)) {
      where.assignedToId = req.user.id;
    }

    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, status: true, assignedToId: true }
    });

    if (leads.length !== ids.length) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'You can only manage leads assigned to you'));
    }

    const now = new Date();
    const updates = leads.map((lead) =>
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedToId,
          assignedAt: now,
          assignedById: req.user.id,
          status: lead.status === 'NEW' ? 'ASSIGNED' : lead.status,
          lastActivityAt: now
        }
      })
    );

    await prisma.$transaction(updates);

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_bulk_assigned',
      entity: 'Lead',
      entityId: ids[0],
      payload: { leadIds: ids, assignedToId, assignee: user.name, count: leads.length },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, `${leads.length} lead(s) assigned to ${user.name} successfully`, {
        processed: leads.length
      })
    );
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteLeads = async (req, res, next) => {
  try {
    const { ids } = req.body;

    const where = { id: { in: ids }, deletedAt: null };
    if (!canAccessAllLeads(req.user)) {
      where.assignedToId = req.user.id;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { clients: { where: { deletedAt: null }, select: { id: true } } }
    });

    if (leads.length !== ids.length) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'You can only manage leads assigned to you'));
    }

    const convertedIds = leads.filter((lead) => lead.clients.length > 0).map((lead) => lead.id);
    if (convertedIds.length > 0) {
      return next(
        new ApiError(
          StatusCodes.CONFLICT,
          `Cannot delete lead(s) ${convertedIds.join(', ')} because they have been converted to clients.`
        )
      );
    }

    const now = new Date();
    await prisma.$transaction(
      leads.map((lead) =>
        prisma.lead.update({ where: { id: lead.id }, data: { deletedAt: now } })
      )
    );

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_bulk_deleted',
      entity: 'Lead',
      entityId: ids[0],
      payload: { leadIds: ids, count: leads.length },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, `${leads.length} lead(s) deleted successfully`, {
        processed: leads.length
      })
    );
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Import / Export
// ──────────────────────────────────────────────────────────────────────────

const resolveCompany = async (row) => {
  if (!row.companyName) return null;

  const existing = await prisma.company.findFirst({
    where: { name: { equals: row.companyName, mode: 'insensitive' }, deletedAt: null }
  });

  const data = {
    website: row.website || undefined,
    address: row.address || undefined,
    pincode: row.pincode || undefined,
    companyType: row.companyType || undefined,
    industryId: row.industryId || null,
    countryId: row.countryId || null,
    stateId: row.stateId || null,
    cityId: row.cityId || null
  };

  if (existing) {
    return prisma.company.update({ where: { id: existing.id }, data });
  }

  return prisma.company.create({ data: { name: row.companyName, ...data } });
};

export const importLeads = async (req, res, next) => {
  try {
    const rows = req.body.leads;
    const seenEmails = new Set();

    // Import creates companies as part of lead ingestion, so honor the
    // 'companies:create' permission for non-administrators.
    const canManageCompanies =
      req.user.role.name === 'Administrator' ||
      (req.user.role.permissions?.companies || []).includes('create');

    if (!canManageCompanies && rows.some((row) => row.companyName)) {
      return next(
        new ApiError(
          StatusCodes.FORBIDDEN,
          "Importing rows with companies requires the 'companies:create' permission."
        )
      );
    }

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const errors = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2; // Header + 1

      try {
        // Validate each row individually so one bad row is skipped and reported
        // instead of aborting the whole batch.
        const { error: rowError, value: cleanRow } = importLeadRowSchema.validate(row, {
          stripUnknown: true,
          abortEarly: false
        });
        if (rowError) {
          failed += 1;
          errors.push({
            row: rowNumber,
            message: rowError.details.map((d) => d.message.replace(/['"]/g, '')).join(', ')
          });
          continue;
        }

        if (!cleanRow.email && !cleanRow.companyName && !cleanRow.contactPerson) {
          skipped += 1;
          continue;
        }

        if (cleanRow.email) {
          const normalizedEmail = cleanRow.email.toLowerCase();
          if (seenEmails.has(normalizedEmail)) {
            skipped += 1;
            continue;
          }
          const existing = await findDuplicateLead(normalizedEmail);
          if (existing) {
            skipped += 1;
            errors.push({ row: rowNumber, message: `Duplicate email (Lead #${existing.id})` });
            continue;
          }
          seenEmails.add(normalizedEmail);
        }

        let companyId = null;
        if (cleanRow.companyName) {
          const company = await resolveCompany(cleanRow);
          companyId = company.id;
        }

        const now = new Date();
        const isAssigned = !!cleanRow.assignedToId;
        let status = normalizeLeadStatus(cleanRow.status) || 'NEW';
        if (isAssigned && status === 'NEW') {
          status = 'ASSIGNED';
        }

        await prisma.lead.create({
          data: {
            title: cleanRow.title || cleanRow.companyName || cleanRow.contactPerson || 'Untitled Lead',
            contactPerson: cleanRow.contactPerson || null,
            email: cleanRow.email || `lead-${Date.now()}-${index}@saiflow.local`,
            phone: cleanRow.phone || null,
            companyId,
            sourceId: cleanRow.sourceId || null,
            priorityId: cleanRow.priorityId || null,
            assignedToId: cleanRow.assignedToId || null,
            assignedAt: isAssigned ? now : null,
            assignedById: isAssigned ? req.user.id : null,
            budget: cleanRow.budget || null,
            currency: cleanRow.currency || 'USD',
            status,
            requirements: cleanRow.requirements || null,
            designation: cleanRow.designation || null,
            alternatePhone: cleanRow.alternatePhone || null,
            alternateEmail: cleanRow.alternateEmail || null,
            expectedCloseDate: cleanRow.expectedCloseDate ? new Date(cleanRow.expectedCloseDate) : null,
            nextFollowUpDate: cleanRow.nextFollowUpDate ? new Date(cleanRow.nextFollowUpDate) : null,
            lastActivityAt: now
          }
        });
        imported += 1;
      } catch (error) {
        failed += 1;
        errors.push({ row: rowNumber, message: error.message || 'Import failed' });
      }
    }

    if (imported > 0) {
      await writeAuditLog({
        userId: req.user.id,
        action: 'lead_imported',
        entity: 'Lead',
        // A bulk import spans many leads; 0 is a sentinel entity id.
        entityId: 0,
        payload: { imported, skipped, failed, errors: errors.slice(0, 10) },
        ipAddress: getIp(req)
      });
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        `Import completed: ${imported} imported, ${skipped} skipped, ${failed} failed`,
        { imported, skipped, failed, errors: errors.slice(0, 25) }
      )
    );
  } catch (error) {
    next(error);
  }
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportLeads = async (req, res, next) => {
  try {
    const where = buildLeadWhere(req);
    const { sortBy, sortOrder } = getSort(req);

    const leads = await prisma.lead.findMany({
      where,
      include: {
        company: { select: { name: true } },
        source: { select: { name: true } },
        priority: { select: { name: true } },
        assignedTo: { select: { name: true, email: true } }
      },
      orderBy: { [sortBy]: sortOrder },
      take: MAX_EXPORT_ROWS
    });

    const headers = [
      'Lead ID',
      'Company',
      'Contact Person',
      'Email',
      'Phone',
      'Status',
      'Priority',
      'Source',
      'Lead Owner',
      'Budget',
      'Currency',
      'Expected Close',
      'Created At'
    ];

    const rows = leads.map((lead) => [
      `SF-LEAD-${String(lead.id).padStart(4, '0')}`,
      lead.company?.name || lead.title,
      lead.contactPerson,
      lead.email,
      lead.phone,
      lead.status,
      lead.priority?.name || '',
      lead.source?.name || '',
      lead.assignedTo?.name || 'Unassigned',
      lead.budget || '',
      lead.currency || '',
      lead.expectedCloseDate ? lead.expectedCloseDate.toISOString().split('T')[0] : '',
      lead.createdAt ? lead.createdAt.toISOString().split('T')[0] : ''
    ]);

    const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="saiflow_leads_${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.status(StatusCodes.OK).send(csv);
  } catch (error) {
    next(error);
  }
};

// ──────────────────────────────────────────────────────────────────────────
// Convert lead to client
// ──────────────────────────────────────────────────────────────────────────

export const convertLeadToClient = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const {
      gstPan,
      paymentTerms,
      creditLimit,
      relationshipManagerId,
      accountManagerId,
      wonAmount
    } = req.body;

    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { clients: { where: { deletedAt: null }, select: { id: true } } }
    });

    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    assertCanEditLead(req, lead);

    if (!lead.companyId) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Lead must have a company before conversion'));
    }

    if (lead.clients.length > 0) {
      return next(new ApiError(StatusCodes.CONFLICT, 'This lead has already been converted to a client'));
    }

    if (!CONVERTIBLE_STATUSES.includes(lead.status)) {
      return next(
        new ApiError(
          StatusCodes.CONFLICT,
          `Lead must be in one of ${CONVERTIBLE_STATUSES.join(', ')} states to be converted (current: ${lead.status})`
        )
      );
    }

    await Promise.all([
      assertRelationExists('user', relationshipManagerId, 'Relationship manager'),
      assertRelationExists('user', accountManagerId, 'Account manager')
    ]);

    const now = new Date();
    const [client] = await prisma.$transaction([
      prisma.client.create({
        data: {
          companyId: lead.companyId,
          leadId: lead.id,
          gstPan: gstPan || null,
          status: 'Active',
          paymentTerms: paymentTerms || null,
          creditLimit: creditLimit || null,
          relationshipManagerId: relationshipManagerId || null,
          accountManagerId: accountManagerId || null
        },
        include: { company: true }
      }),
      prisma.lead.update({
        where: { id },
        data: {
          status: 'WON',
          wonAmount: wonAmount !== undefined ? wonAmount : lead.budget,
          closedAt: now,
          convertedAt: now,
          lastActivityAt: now
        }
      })
    ]);

    await writeAuditLog({
      userId: req.user.id,
      action: 'lead_converted',
      entity: 'Lead',
      entityId: id,
      payload: { clientId: client.id, companyId: lead.companyId },
      ipAddress: getIp(req)
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Lead converted to client successfully', { client, leadId: id })
    );
  } catch (error) {
    next(error);
  }
};
