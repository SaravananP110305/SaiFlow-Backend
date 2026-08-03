import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAssignees
} from '../controllers/user.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/assignees', getAssignees);
router.get('/', requirePermission('users', 'view'), getUsers);
router.get('/:id', requirePermission('users', 'view'), getUserById);
router.post('/', requirePermission('users', 'create'), validate(createUserSchema), createUser);
router.put('/:id', requirePermission('users', 'edit'), validate(updateUserSchema), updateUser);
router.delete('/:id', requirePermission('users', 'delete'), deleteUser);

export default router;
