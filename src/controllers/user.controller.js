import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { search, status, roleId } = req.query;

    const where = {
      deletedAt: null,
      ...(status && { status }),
      ...(roleId && { roleId: parseInt(roleId, 10) }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          role: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        'Users retrieved successfully',
        users,
        {
          total,
          page,
          limit,
          totalPages
        }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        roleId: true,
        department: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    if (!user) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'User retrieved successfully', user)
    );
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, department, roleId, status } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && !existingUser.deletedAt) {
      return next(new ApiError(StatusCodes.CONFLICT, `User with email '${email}' already exists`));
    }

    const roleExists = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null }
    });

    if (!roleExists) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role ID provided'));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        phone,
        department,
        roleId,
        status: status || 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        department: true,
        status: true,
        roleId: true,
        createdAt: true,
        role: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Created successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { name, email, phone, department, roleId, status } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!existingUser) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found'));
    }

    if (
      req.user.id === userId &&
      status &&
      existingUser.status === 'ACTIVE' &&
      ['INACTIVE', 'SUSPENDED'].includes(status)
    ) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'You cannot deactivate your own account.'));
    }

    if (email && email !== existingUser.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email, id: { not: userId } }
      });
      if (duplicate && !duplicate.deletedAt) {
        return next(new ApiError(StatusCodes.CONFLICT, `Email '${email}' is already in use`));
      }
    }

    if (roleId && roleId !== existingUser.roleId) {
      const roleExists = await prisma.role.findFirst({
        where: { id: roleId, deletedAt: null }
      });
      if (!roleExists) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role ID provided'));
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(department !== undefined && { department }),
        ...(roleId && { roleId }),
        ...(status && { status })
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        department: true,
        status: true,
        roleId: true,
        updatedAt: true,
        role: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Updated successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    // Prevent self-deletion
    if (req.user.id === userId) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'You cannot delete your own account'));
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!user) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found'));
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
        refreshTokenHash: null // Log out user session
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const getAssignees = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Assignees retrieved successfully', users)
    );
  } catch (error) {
    next(error);
  }
};
