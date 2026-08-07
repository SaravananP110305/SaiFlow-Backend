import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// ─── Phase / Pricing helpers ───────────────────────────────────────────────

const PHASE_INCLUDE = {
  objectives: { orderBy: { id: 'asc' } },
  technicalRequirements: { orderBy: { id: 'asc' } },
  deliverables: { orderBy: { id: 'asc' } },
  assumptions: { orderBy: { id: 'asc' } },
  constraints: { orderBy: { id: 'asc' } },
  lineItems: { orderBy: { sortOrder: 'asc' } }
};

// Attaches a per-phase `subtotal` and normalizes each line item amount
// (amount = unitPrice * quantity) so pricing is always server-computed.
const computePhaseSubtotals = (phases) =>
  (phases || []).map((p) => {
    const lineItems = (p.lineItems || []).map((li) => ({
      ...li,
      quantity: Number(li.quantity) || 1,
      unitPrice: round2(li.unitPrice),
      amount: round2((Number(li.unitPrice) || 0) * (Number(li.quantity) || 1))
    }));
    return {
      ...p,
      lineItems,
      subtotal: lineItems.reduce((s, li) => s + li.amount, 0)
    };
  });

const computePricing = (phases, discountPercent, taxPercent) => {
  const subtotal = round2(phases.reduce((s, p) => s + p.subtotal, 0));
  const discountAmount = round2(subtotal * ((Number(discountPercent) || 0) / 100));
  const afterDiscount = round2(subtotal - discountAmount);
  const taxAmount = round2(afterDiscount * ((Number(taxPercent) || 0) / 100));
  const grandTotal = round2(afterDiscount + taxAmount);
  return { subtotal, discountPercent: Number(discountPercent) || 0, discountAmount, taxPercent: Number(taxPercent) || 0, taxAmount, grandTotal };
};

// Flattens all phase line items into the legacy `estimation` JSON shape so
// existing list/detail/PDF code that reads `estimation` keeps working.
const buildEstimationJson = (phases, pricing) => ({
  items: phases.flatMap((p) =>
    p.lineItems.map((li) => ({
      id: String(li.id || `li-${Math.random().toString(36).slice(2, 8)}`),
      category: li.category,
      description: li.description,
      unit: li.unit || 'Project',
      quantity: li.quantity || 1,
      unitPrice: li.unitPrice,
      amount: li.amount
    }))
  ),
  subtotal: pricing.subtotal,
  discountPercent: pricing.discountPercent,
  discountAmount: pricing.discountAmount,
  taxPercent: pricing.taxPercent,
  taxAmount: pricing.taxAmount,
  total: pricing.grandTotal
});

const cleanList = (arr) =>
  (Array.isArray(arr) ? arr : []).map((t) => String(t).trim()).filter((t) => t !== '');

const buildPhaseCreateData = (phases) =>
  phases.map((p, idx) => ({
    phaseName: p.phaseName,
    overview: p.overview || '',
    estimatedTimeline: p.estimatedTimeline || '',
    sortOrder: idx,
    objectives: { create: cleanList(p.objectives).map((text) => ({ text })) },
    technicalRequirements: { create: cleanList(p.technicalRequirements).map((text) => ({ text })) },
    deliverables: { create: cleanList(p.deliverables).map((text) => ({ text })) },
    assumptions: { create: cleanList(p.assumptions).map((text) => ({ text })) },
    constraints: { create: cleanList(p.constraints).map((text) => ({ text })) },
    lineItems: {
      create: (p.lineItems || []).map((li, liIdx) => ({
        category: li.category,
        description: li.description,
        unitPrice: round2(li.unitPrice),
        quantity: Number(li.quantity) || 1,
        amount: round2((Number(li.unitPrice) || 0) * (Number(li.quantity) || 1)),
        sortOrder: liIdx
      }))
    }
  }));

const preparePhasePayload = (body, existing) => {
  const phases = computePhaseSubtotals(body.phases);
  const discountPercent = body.discountPercent !== undefined
    ? body.discountPercent
    : existing?.estimation?.discountPercent ?? 0;
  const taxPercent = body.taxPercent !== undefined
    ? body.taxPercent
    : existing?.estimation?.taxPercent ?? 0;
  const pricing = computePricing(phases, discountPercent, taxPercent);
  return { phases, pricing, estimation: buildEstimationJson(phases, pricing) };
};

export const getProposals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { leadId, clientId, status, createdById, search } = req.query;

    const where = {
      ...(leadId && { leadId: parseInt(leadId, 10) }),
      ...(clientId && { clientId: parseInt(clientId, 10) }),
      ...(status && { status }),
      ...(createdById && { createdById: parseInt(createdById, 10) }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { proposalNumber: { contains: search, mode: 'insensitive' } },
          { lead: { title: { contains: search, mode: 'insensitive' } } },
          { lead: { contactPerson: { contains: search, mode: 'insensitive' } } },
          { client: { company: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      })
    };

    const [total, proposals] = await Promise.all([
      prisma.proposal.count({ where }),
      prisma.proposal.findMany({
        where,
        select: {
          id: true,
          proposalNumber: true,
          title: true,
          amount: true,
          status: true,
          validUntil: true,
          createdAt: true,
          requirements: true,
          estimation: true,
          quotation: true,
          lead: {
            select: { id: true, title: true, contactPerson: true, email: true, phone: true, requirements: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        'Proposals retrieved successfully',
        proposals,
        { total, page, limit, totalPages: Math.ceil(total / limit) }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getProposalById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: {
        id: true,
        proposalNumber: true,
        title: true,
        amount: true,
        status: true,
        validUntil: true,
        createdAt: true,
        requirements: true,
        estimation: true,
        quotation: true,
        lead: {
          select: { id: true, title: true, contactPerson: true, email: true, phone: true }
        },
        phases: {
          include: PHASE_INCLUDE,
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (!proposal) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Proposal retrieved successfully', proposal)
    );
  } catch (error) {
    next(error);
  }
};

export const createProposal = async (req, res, next) => {
  try {
    const {
      leadId, clientId, proposalNumber, title, amount, status, documentUrl, validUntil,
      requirements, estimation, quotation, phases
    } = req.body;
    const createdById = req.user.id;

    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
      if (!lead) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Associated lead does not exist'));
      }
    }

    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
      if (!client) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Associated client does not exist'));
      }
    }

    const existingNumber = await prisma.proposal.findUnique({ where: { proposalNumber } });
    if (existingNumber) {
      return next(new ApiError(StatusCodes.CONFLICT, `Proposal number '${proposalNumber}' already exists`));
    }

    // Check if status is Accepted, Approved, or Won
    const isApprovedStatus = (s) => s && ['accepted', 'approved', 'won'].includes(s.toLowerCase());
    if (isApprovedStatus(status)) {
      if (req.user.role.name !== 'Administrator') {
        const permissions = req.user.role.permissions || {};
        const moduleActions = permissions.proposals || [];
        if (!moduleActions.includes('approve')) {
          return next(
            new ApiError(
              StatusCodes.FORBIDDEN,
              "Permission denied: Requires 'approve' right on module 'proposals'"
            )
          );
        }
      }
    }

    // Compute pricing/amount from phases when supplied (phase-wise mode)
    let finalAmount = amount;
    let finalEstimation = estimation || null;
    let finalPricing = null;
    const phasePayload = Array.isArray(phases) && phases.length ? preparePhasePayload(req.body) : null;
    if (phasePayload) {
      finalAmount = phasePayload.pricing.grandTotal;
      finalEstimation = phasePayload.estimation;
      finalPricing = phasePayload.pricing;
    }

    const transactionQueries = [
      prisma.proposal.create({
        data: {
          leadId: leadId || null,
          clientId: clientId || null,
          proposalNumber,
          title,
          amount: finalAmount,
          status: status || 'Draft',
          documentUrl,
          validUntil: validUntil ? new Date(validUntil) : null,
          createdById,
          requirements,
          estimation: finalEstimation,
          quotation,
          pricing: finalPricing,
          ...(phasePayload && { phases: { create: buildPhaseCreateData(phasePayload.phases) } })
        },
        include: {
          lead: { select: { id: true, title: true } },
          client: { include: { company: true } },
          createdBy: { select: { id: true, name: true } }
        }
      })
    ];

    if (leadId) {
      transactionQueries.push(
        prisma.lead.update({
          where: { id: leadId },
          data: { status: 'PROPOSAL' }
        })
      );
    }

    const [proposal] = await prisma.$transaction(transactionQueries);

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Created successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updateProposal = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.proposal.findUnique({ where: { id } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found'));
    }

    const {
      proposalNumber, title, amount, status, documentUrl, validUntil,
      requirements, estimation, quotation, phases
    } = req.body;

    // Check if status is transitioning to Accepted, Approved, or Won
    const isApprovedStatus = (s) => s && ['accepted', 'approved', 'won'].includes(s.toLowerCase());
    const isChangingToApproved = isApprovedStatus(status) && existing.status !== status;

    if (isChangingToApproved) {
      if (req.user.role.name !== 'Administrator') {
        const permissions = req.user.role.permissions || {};
        const moduleActions = permissions.proposals || [];
        if (!moduleActions.includes('approve')) {
          return next(
            new ApiError(
              StatusCodes.FORBIDDEN,
              "Permission denied: Requires 'approve' right on module 'proposals'"
            )
          );
        }
      }
    }

    if (proposalNumber && proposalNumber !== existing.proposalNumber) {
      const duplicate = await prisma.proposal.findUnique({ where: { proposalNumber } });
      if (duplicate) {
        return next(new ApiError(StatusCodes.CONFLICT, `Proposal number '${proposalNumber}' already exists`));
      }
    }

    // Recompute pricing/amount from phases when supplied (phase-wise mode)
    const phasePayload = Array.isArray(phases) && phases.length ? preparePhasePayload(req.body, existing) : null;
    const finalAmount = phasePayload ? phasePayload.pricing.grandTotal : amount;
    const finalEstimation = phasePayload ? phasePayload.estimation : estimation;
    const finalPricing = phasePayload ? phasePayload.pricing : undefined;

    const data = {
      ...(proposalNumber && { proposalNumber }),
      ...(title && { title }),
      ...(finalAmount !== undefined && { amount: finalAmount }),
      ...(status && { status }),
      ...(documentUrl !== undefined && { documentUrl }),
      ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
      ...(requirements !== undefined && { requirements }),
      ...(finalEstimation !== undefined && { estimation: finalEstimation }),
      ...(quotation !== undefined && { quotation }),
      ...(finalPricing !== undefined && { pricing: finalPricing }),
      ...(phasePayload && { phases: { create: buildPhaseCreateData(phasePayload.phases) } })
    };

    const updated = phasePayload
      ? (await prisma.$transaction([
          prisma.proposalPhase.deleteMany({ where: { proposalId: id } }),
          prisma.proposal.update({ where: { id }, data })
        ]))[1]
      : await prisma.proposal.update({ where: { id }, data });

    // Auto-advance lead status to WON if proposal status is marked Accepted or Won
    if (status && (status.toLowerCase() === 'accepted' || status.toLowerCase() === 'won') && existing.leadId) {
      await prisma.lead.update({
        where: { id: existing.leadId },
        data: { status: 'WON' }
      });
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const deleteProposal = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.proposal.findUnique({ where: { id } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Proposal not found'));
    }

    await prisma.proposal.delete({ where: { id } });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
