import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/token.util.js';
import prisma from '../config/prisma.js';

export const isAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Access token is required'));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Access token has expired'));
      }
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid access token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: true
      }
    });

    if (!user || user.deletedAt) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'User account no longer exists'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new ApiError(StatusCodes.FORBIDDEN, `Your account status is ${user.status}. Please contact support.`));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const hasRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'User authentication required'));
    }

    const hasMatchedRole = allowedRoles.includes(req.user.role.name);
    if (!hasMatchedRole) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this resource'));
    }

    next();
  };
};

export const hasPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'User authentication required'));
    }

    const permissions = req.user.role.permissions || {};
    const modulePermissions = permissions[module] || [];

    if (!modulePermissions.includes(action)) {
      return next(new ApiError(StatusCodes.FORBIDDEN, `You do not have permission to execute [${action}] on module [${module}]`));
    }

    next();
  };
};
