import { Router } from 'express';
import {
  getMeetings,
  getMeetingById,
  createMeeting,
  updateMeeting,
  updateMeetingStatus,
  deleteMeeting
} from '../controllers/meeting.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createMeetingSchema,
  updateMeetingSchema,
  updateMeetingStatusSchema
} from '../validators/meeting.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('meetings', 'view'), getMeetings);
router.get('/:id', requirePermission('meetings', 'view'), getMeetingById);
router.post('/', requirePermission('meetings', 'create'), validate(createMeetingSchema), createMeeting);
router.put('/:id', requirePermission('meetings', 'edit'), validate(updateMeetingSchema), updateMeeting);
router.patch('/:id', requirePermission('meetings', 'edit'), validate(updateMeetingStatusSchema), updateMeetingStatus);
router.delete('/:id', requirePermission('meetings', 'delete'), deleteMeeting);

export default router;
