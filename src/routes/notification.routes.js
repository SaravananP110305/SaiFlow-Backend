import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notification.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('notifications', 'view'), getNotifications);
router.patch('/read-all', requirePermission('notifications', 'view'), markAllAsRead);
router.patch('/:id/read', requirePermission('notifications', 'view'), markAsRead);

export default router;
