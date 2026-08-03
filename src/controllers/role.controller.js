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
          { description: { contains: search, mode: 'insensitive' } }
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
        ...role,
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
      ...role,
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
        ...role,
        userCount: role._count.users
      })
    );
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;

    const existing = await prisma.role.findFirst({
      where: { name, deletedAt: null }
    });

    if (existing) {
      return next(new ApiError(StatusCodes.CONFLICT, `Role with name '${name}' already exists`));
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions || {},
        isSystem: false
      }
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Role created successfully', role)
    );
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const roleId = parseInt(req.params.id, 10);
    const { name, description, permissions } = req.body;

    const existingRole = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null }
    });

    if (!existingRole) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Role not found'));
    }

    if (name && name !== existingRole.name) {
      const duplicate = await prisma.role.findFirst({
        where: { name, id: { not: roleId }, deletedAt: null }
      });
      if (duplicate) {
        return next(new ApiError(StatusCodes.CONFLICT, `Role with name '${name}' already exists`));
      }
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(permissions !== undefined && { permissions })
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Role updated successfully', updatedRole)
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

    if (role.isSystem) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'System roles cannot be deleted'));
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
      new ApiResponse(StatusCodes.OK, 'Role deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
