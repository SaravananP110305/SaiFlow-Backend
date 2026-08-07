import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getRoles = async (req, res, next) => {
  try {
    const { search, paginate, page = '1', limit = '10' } = req.query;

    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { status: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    if (paginate === 'true') {
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      const [total, roles] = await Promise.all([
        prisma.role.count({ where }),
        prisma.role.findMany({
          where,
          include: {
            _count: {
              select: { users: { where: { deletedAt: null } } }
            }
          },
          orderBy: { id: 'asc' },
          skip,
          take: limitNum
        })
      ]);

      const data = roles.map((role) => ({
        id: role.id,
        name: role.name,
        status: role.status,
        userCount: role._count.users
      }));

      return res.status(StatusCodes.OK).json(
        new ApiResponse(
          StatusCodes.OK,
          'Roles retrieved successfully',
          data,
          { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
        )
      );
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } }
        }
      },
      orderBy: { id: 'asc' }
    });

    const data = roles.map((role) => ({
      id: role.id,
      name: role.name,
      status: role.status,
      userCount: role._count.users
    }));

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Roles retrieved successfully', data)
    );
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const role = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } }
        }
      }
    });

    if (!role) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Role not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Role retrieved successfully', {
        id: role.id,
        name: role.name,
        status: role.status,
        permissions: role.permissions || {}
      })
    );
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, permissions } = req.body;

    const existing = await prisma.role.findFirst({
      where: { name }
    });

    if (existing && !existing.deletedAt) {
      return next(new ApiError(StatusCodes.CONFLICT, `Role with name '${name}' already exists`));
    }

    let role;
    if (existing) {
      role = await prisma.role.update({
        where: { id: existing.id },
        data: {
          permissions: permissions || {},
          status: 'Active',
          deletedAt: null
        }
      });
    } else {
      role = await prisma.role.create({
        data: {
          name,
          permissions: permissions || {},
          status: 'Active'
        }
      });
    }

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Created successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const { name, status, permissions } = req.body;

    const existingRole = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null }
    });

    if (!existingRole) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Role not found'));
    }

    if (name && name !== existingRole.name) {
      const duplicate = await prisma.role.findFirst({
        where: { name, id: { not: roleId } }
      });
      if (duplicate) {
        return next(new ApiError(StatusCodes.CONFLICT, `Role with name '${name}' already exists`));
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(name && { name }),
        ...(status !== undefined && { status }),
        ...(permissions !== undefined && { permissions })
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id, 10);

    const role = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } }
        }
      }
    });

    if (!role) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Role not found'));
    }

    if (role._count.users > 0) {
      return next(
        new ApiError(
          StatusCodes.BAD_REQUEST,
          `Cannot delete role '${role.name}'. It is currently assigned to ${role._count.users} user(s). Reassign them first.`
        )
      );
    }

    await prisma.role.update({
      where: { id: roleId },
      data: { deletedAt: new Date() }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
