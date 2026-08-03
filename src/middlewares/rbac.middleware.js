import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

/**
 * Ensures the authenticated user possesses one of the specified roles.
 * @param  {...string} allowedRoles List of allowed role names (e.g. 'Administrator', 'Business Development Manager')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required'));
    }

    const userRole = req.user.role.name;
    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(StatusCodes.FORBIDDEN, `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`));
    }

    next();
  };
};

/**
 * Checks if the user's role permissions JSON contains the specified action for a target module.
 * @param {string} module Target module (e.g. 'leads', 'meetings', 'proposals', 'clients', 'users', 'roles', 'reports')
 * @param {string} action Required permission action (e.g. 'view', 'create', 'edit', 'delete', 'export', 'assign', 'approve')
 */
export const requirePermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required'));
    }

    // Administrators bypass permission checks
    if (req.user.role.name === 'Administrator') {
      return next();
    }

    const permissions = req.user.role.permissions || {};
    const moduleActions = permissions[module] || [];

    if (!Array.isArray(moduleActions) || !moduleActions.includes(action)) {
      return next(
        new ApiError(
          StatusCodes.FORBIDDEN,
          `Permission denied: Requires '${action}' right on module '${module}'`
        )
      );
    }

    next();
  };
};

/**
 * Ownership check middleware: Allows execution if req.user.id matches req.params[paramKey] OR if user has an allowed role.
 * @param {string} paramKey Route parameter key storing target user ID (e.g. 'id')
 * @param  {...string} allowedRoles Override role names allowed to access regardless of ownership (e.g. 'Administrator')
 */
export const requireSelfOrRole = (paramKey = 'id', ...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required'));
    }

    const targetId = parseInt(req.params[paramKey], 10);
    const isOwner = req.user.id === targetId;
    const hasOverrideRole = req.user.role && allowedRoles.includes(req.user.role.name);

    if (!isOwner && !hasOverrideRole) {
      return next(new ApiError(StatusCodes.FORBIDDEN, 'Access denied: You can only manage your own record'));
    }

    next();
  };
};
