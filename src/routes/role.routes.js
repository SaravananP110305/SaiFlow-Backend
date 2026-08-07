import { Router } from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from '../controllers/role.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRoleSchema, updateRoleSchema } from '../validators/role.validator.js';

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-role', requirePermission('roles', 'view'), bodyToQuery, getRoles);
router.get('/get-role/:id', requirePermission('roles', 'view'), getRoleById);
router.post('/create-role', requirePermission('roles', 'create'), validate(createRoleSchema, { stripUnknown: false }), createRole);
router.put('/update-role/:id', requirePermission('roles', 'edit'), validate(updateRoleSchema, { stripUnknown: false }), updateRole);
router.delete('/delete-role/:id', requirePermission('roles', 'delete'), deleteRole);

export default router;
