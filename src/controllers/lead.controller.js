import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getLeads = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { search, status, sourceId, priorityId, assignedToId, companyId } = req.query;

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(sourceId && { sourceId: parseInt(sourceId, 10) }),
      ...(priorityId && { priorityId: parseInt(priorityId, 10) }),
      ...(assignedToId && { assignedToId: parseInt(assignedToId, 10) }),
      ...(companyId && { companyId: parseInt(companyId, 10) }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { contactPerson: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          company: { select: { id: true, name: true } },
          source: { select: { id: true, name: true } },
          priority: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { meetings: true, proposals: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        'Leads retrieved successfully',
        leads,
        { total, page, limit, totalPages: Math.ceil(total / limit) }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getLeadById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lead = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        source: true,
        priority: true,
        assignedTo: {
          select: { id: true, name: true, email: true, phone: true }
        },
        meetings: {
          orderBy: { scheduledAt: 'desc' }
        },
        proposals: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead retrieved successfully', lead)
    );
  } catch (error) {
    next(error);
  }
};

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
      requirements
    } = req.body;

    // Validate relationships if IDs are passed
    if (assignedToId) {
      const user = await prisma.user.findFirst({ where: { id: assignedToId, deletedAt: null } });
      if (!user) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Assigned user does not exist'));
      }
    }

    const initialStatus = assignedToId && status === 'NEW' ? 'ASSIGNED' : (status || 'NEW');

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
        budget,
        currency: currency || 'USD',
        status: initialStatus,
        requirements
      },
      include: {
        company: true,
        source: true,
        priority: true,
        assignedTo: { select: { id: true, name: true, email: true } }
      }
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
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

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
      requirements
    } = req.body;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(contactPerson && { contactPerson }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(companyId !== undefined && { companyId }),
        ...(sourceId !== undefined && { sourceId }),
        ...(priorityId !== undefined && { priorityId }),
        ...(assignedToId !== undefined && { assignedToId }),
        ...(budget !== undefined && { budget }),
        ...(currency && { currency }),
        ...(status && { status }),
        ...(requirements !== undefined && { requirements })
      },
      include: {
        company: true,
        source: true,
        priority: true,
        assignedTo: { select: { id: true, name: true, email: true } }
      }
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
    const id = parseInt(req.params.id, 10);
    const { assignedToId } = req.body;

    const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    const user = await prisma.user.findFirst({ where: { id: assignedToId, deletedAt: null } });
    if (!user) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Assigned user does not exist'));
    }

    const newStatus = lead.status === 'NEW' ? 'ASSIGNED' : lead.status;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        assignedToId,
        status: newStatus
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } }
      }
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
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.lead.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Lead not found'));
    }

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
