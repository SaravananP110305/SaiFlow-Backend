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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-user-assignees', getAssignees);
router.post('/get-user', requirePermission('users', 'view'), bodyToQuery, getUsers);
router.get('/get-user/:id', requirePermission('users', 'view'), getUserById);
router.post('/create-user', requirePermission('users', 'create'), validate(createUserSchema), createUser);
router.put('/update-user/:id', requirePermission('users', 'edit'), validate(updateUserSchema), updateUser);
router.delete('/delete-user/:id', requirePermission('users', 'delete'), deleteUser);

export default router;
