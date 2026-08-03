import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getClients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        company: { name: { contains: search, mode: 'insensitive' } }
      })
    };

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: {
          company: true,
          lead: { select: { id: true, title: true, status: true, budget: true } },
          projects: {
            include: {
              pm: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
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
        'Clients retrieved successfully',
        clients,
        { total, page, limit, totalPages: Math.ceil(total / limit) }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getClientById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const client = await prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        lead: true,
        projects: {
          include: {
            pm: { select: { id: true, firstName: true, lastName: true, email: true } }
          }
        }
      }
    });

    if (!client) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Client not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Client retrieved successfully', client)
    );
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const { companyId, leadId, gstPan, status } = req.body;

    const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Company does not exist'));
    }

    if (leadId) {
      const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
      if (!lead) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Lead does not exist'));
      }
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        leadId: leadId || null,
        gstPan,
        status: status || 'Active'
      },
      include: {
        company: true,
        lead: true
      }
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Client onboarding completed successfully', client)
    );
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { gstPan, status } = req.body;

    const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Client not found'));
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(gstPan !== undefined && { gstPan }),
        ...(status && { status })
      },
      include: {
        company: true
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Client details updated successfully', updated)
    );
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.client.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Client not found'));
    }

    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Client deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

// --- Project Handover Controllers ---

export const getProjects = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { clientId, pmId, status, search } = req.query;

    const where = {
      ...(clientId && { clientId: parseInt(clientId, 10) }),
      ...(pmId && { pmId: parseInt(pmId, 10) }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { client: { company: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      })
    };

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          client: { include: { company: true } },
          pm: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        'Projects retrieved successfully',
        projects,
        { total, page, limit, totalPages: Math.ceil(total / limit) }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { clientId, name, pmId, status, handoverDate, srsDocumentUrl } = req.body;

    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } });
    if (!client) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Client does not exist'));
    }

    if (pmId) {
      const pm = await prisma.user.findFirst({ where: { id: pmId, deletedAt: null } });
      if (!pm) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Assigned Project Manager does not exist'));
      }
    }

    const project = await prisma.project.create({
      data: {
        clientId,
        name,
        pmId,
        status: status || 'Kickoff',
        handoverDate: handoverDate ? new Date(handoverDate) : new Date(),
        srsDocumentUrl
      },
      include: {
        client: { include: { company: true } },
        pm: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Project handover created successfully', project)
    );
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, pmId, status, handoverDate, srsDocumentUrl } = req.body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Project not found'));
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(pmId !== undefined && { pmId }),
        ...(status && { status }),
        ...(handoverDate !== undefined && { handoverDate: handoverDate ? new Date(handoverDate) : null }),
        ...(srsDocumentUrl !== undefined && { srsDocumentUrl })
      },
      include: {
        client: { include: { company: true } },
        pm: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Project updated successfully', updated)
    );
  } catch (error) {
    next(error);
  }
};
