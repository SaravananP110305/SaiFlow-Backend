import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getMasterItems = async (req, res, next) => {
  try {
    const { category, parentId, status, search, paginate, page = '1', limit = '10' } = req.query;

    const where = {
      ...(category && { category }),
      ...(parentId !== undefined && { parentId: parentId === 'null' ? null : parseInt(parentId, 10) }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { id: Number.isInteger(Number(search)) ? Number(search) : -1 },
          { name: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { status: { contains: search, mode: 'insensitive' } },
          { parent: { name: { contains: search, mode: 'insensitive' } } }
        ]
      })
    };

    if (paginate === 'true') {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [total, items] = await Promise.all([
        prisma.masterItem.count({ where }),
        prisma.masterItem.findMany({
          where,
          select: {
            id: true,
            category: true,
            name: true,
            status: true,
            parentId: true,
            parent: { select: { id: true, name: true, category: true } }
          },
          orderBy: { name: 'asc' },
          skip,
          take: limitNum
        })
      ]);

      return res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          'Master items retrieved successfully',
          items,
          { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
        )
      );
    }

    const items = await prisma.masterItem.findMany({
      where,
      select: {
        id: true,
        category: true,
        name: true,
        status: true,
        parentId: true,
        parent: { select: { id: true, name: true, category: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Master items retrieved successfully', items)
    );
  } catch (error) {
    next(error);
  }
};

export const getMasterItemById = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const item = await prisma.masterItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        category: true,
        name: true,
        status: true,
        parentId: true,
        parent: { select: { id: true, name: true, category: true } }
      }
    });

    if (!item) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Master data item not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Master data item retrieved successfully', item)
    );
  } catch (error) {
    next(error);
  }
};

export const createMasterItem = async (req, res, next) => {
  try {
    const { category, name, status, parentId } = req.body;

    if (parentId) {
      const parent = await prisma.masterItem.findUnique({ where: { id: parentId } });
      if (!parent) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Invalid parent ID provided'));
      }
    }

    const item = await prisma.masterItem.create({
      data: {
        category,
        name,
        status: status || 'Active',
        parentId: parentId || null
      }
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Created successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updateMasterItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const { name, status, parentId } = req.body;

    const existing = await prisma.masterItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Master item not found'));
    }

    if (parentId) {
      const parent = await prisma.masterItem.findUnique({ where: { id: parentId } });
      if (!parent) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Invalid parent ID provided'));
      }
    }

    const updated = await prisma.masterItem.update({
      where: { id: itemId },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(parentId !== undefined && { parentId: parentId || null })
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const deleteMasterItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);

    const existing = await prisma.masterItem.findUnique({
      where: { id: itemId },
      include: { _count: { select: { children: true } } }
    });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Master item not found'));
    }

    if (existing._count.children > 0) {
      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `Cannot delete '${existing.name}' because it has ${existing._count.children} linked child item(s). Delete or reassign children first.`
        )
      );
    }

    await prisma.masterItem.delete({
      where: { id: itemId }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
