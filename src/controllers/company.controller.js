import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getCompanies = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;
    const { search, industryId } = req.query;

    const where = {
      deletedAt: null,
      ...(industryId && { industryId: parseInt(industryId, 10) }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' }
      })
    };

    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        include: {
          industry: { select: { id: true, name: true } },
          country: { select: { id: true, name: true } },
          state: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        'Companies retrieved successfully',
        companies,
        { total, page, limit, totalPages: Math.ceil(total / limit) }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        industry: true,
        country: true,
        state: true,
        city: true
      }
    });

    if (!company) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Company not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Company retrieved successfully', company)
    );
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req, res, next) => {
  try {
    const { name, website, email, phone, address, pincode, companyType, industryId, countryId, stateId, cityId } = req.body;

    const company = await prisma.company.create({
      data: {
        name,
        website,
        email: email || null,
        phone: phone || null,
        address,
        pincode,
        companyType,
        industryId,
        countryId,
        stateId,
        cityId
      },
      include: {
        industry: true
      }
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Company created successfully', company)
    );
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, website, email, phone, address, pincode, companyType, industryId, countryId, stateId, cityId } = req.body;

    const existing = await prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Company not found'));
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(website !== undefined && { website }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(address !== undefined && { address }),
        ...(pincode !== undefined && { pincode }),
        ...(companyType !== undefined && { companyType }),
        ...(industryId !== undefined && { industryId }),
        ...(countryId !== undefined && { countryId }),
        ...(stateId !== undefined && { stateId }),
        ...(cityId !== undefined && { cityId })
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Company updated successfully', updated)
    );
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.company.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Company not found'));
    }

    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Company deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
