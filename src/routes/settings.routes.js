import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('settings', 'view'), getSettings);
router.put('/', requirePermission('settings', 'edit'), validate(updateSettingsSchema), updateSettings);

export default router;
