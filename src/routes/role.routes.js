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

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('roles', 'view'), getRoles);
router.get('/:id', requirePermission('roles', 'view'), getRoleById);
router.post('/', requirePermission('roles', 'create'), validate(createRoleSchema), createRole);
router.put('/:id', requirePermission('roles', 'edit'), validate(updateRoleSchema), updateRole);
router.delete('/:id', requirePermission('roles', 'delete'), deleteRole);

export default router;
