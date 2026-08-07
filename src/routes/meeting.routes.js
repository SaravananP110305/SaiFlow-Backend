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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-meeting', requirePermission('meetings', 'view'), bodyToQuery, getMeetings);
router.get('/get-meeting/:id', requirePermission('meetings', 'view'), getMeetingById);
router.post('/create-meeting', requirePermission('meetings', 'create'), validate(createMeetingSchema), createMeeting);
router.put('/update-meeting/:id', requirePermission('meetings', 'edit'), validate(updateMeetingSchema), updateMeeting);
router.patch('/update-meeting-status/:id', requirePermission('meetings', 'edit'), validate(updateMeetingStatusSchema), updateMeetingStatus);
router.delete('/delete-meeting/:id', requirePermission('meetings', 'delete'), deleteMeeting);

export default router;
