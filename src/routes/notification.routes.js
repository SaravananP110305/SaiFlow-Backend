import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notification.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-notification', requirePermission('notifications', 'view'), bodyToQuery, getNotifications);
router.put('/update-notification-all/read', requirePermission('notifications', 'view'), markAllAsRead);
router.put('/update-notification-read/:id', requirePermission('notifications', 'view'), markAsRead);

export default router;
