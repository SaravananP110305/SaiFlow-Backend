import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getProposals = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { leadId, status, createdById, search } = req.query;

    const where = {
      ...(leadId && { leadId: parseInt(leadId, 10) }),
      ...(status && { status }),
      ...(createdById && { createdById: parseInt(createdById, 10) }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { proposalNumber: { contains: search, mode: 'insensitive' } },
          { lead: { title: { contains: search, mode: 'insensitive' } } },
          { lead: { contactPerson: { contains: search, mode: 'insensitive' } } },
          { lead: { company: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      })
    };

    const [total, proposals] = await Promise.all([
      prisma.proposal.count({ where }),
      prisma.proposal.findMany({
        where,
        include: {
          lead: { select: { id: true, title: true, contactPerson: true, email: true, status: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }
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
      include: {
        lead: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } }
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
    const { leadId, proposalNumber, title, amount, status, documentUrl, validUntil } = req.body;
    const createdById = req.user.id;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Associated lead does not exist'));
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

    const [proposal] = await prisma.$transaction([
      prisma.proposal.create({
        data: {
          leadId,
          proposalNumber,
          title,
          amount,
          status: status || 'Draft',
          documentUrl,
          validUntil: validUntil ? new Date(validUntil) : null,
          createdById
        },
        include: {
          lead: { select: { id: true, title: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } }
        }
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { status: 'PROPOSAL' }
      })
    ]);

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Proposal created successfully', proposal)
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

    const { proposalNumber, title, amount, status, documentUrl, validUntil } = req.body;

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

    const updated = await prisma.proposal.update({
      where: { id },
      data: {
        ...(proposalNumber && { proposalNumber }),
        ...(title && { title }),
        ...(amount !== undefined && { amount }),
        ...(status && { status }),
        ...(documentUrl !== undefined && { documentUrl }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null })
      }
    });

    // Auto-advance lead status to WON if proposal status is marked Accepted or Won
    if (status && (status.toLowerCase() === 'accepted' || status.toLowerCase() === 'won')) {
      await prisma.lead.update({
        where: { id: existing.leadId },
        data: { status: 'WON' }
      });
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Proposal updated successfully', updated)
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
      new ApiResponse(StatusCodes.OK, 'Proposal deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
