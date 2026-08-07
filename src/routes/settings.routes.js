import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-settings', requirePermission('settings', 'view'), bodyToQuery, getSettings);
router.put('/update-settings', requirePermission('settings', 'edit'), validate(updateSettingsSchema), updateSettings);

export default router;
