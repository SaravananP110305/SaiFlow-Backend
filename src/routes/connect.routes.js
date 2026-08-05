import { Router } from 'express';
import {
  getConnects,
  createConnect,
  updateConnect
} from '../controllers/connect.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createConnectSchema,
  updateConnectSchema
} from '../validators/connect.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('connect', 'view'), getConnects);
router.post('/', requirePermission('connect', 'create'), validate(createConnectSchema), createConnect);
router.patch('/:id', requirePermission('connect', 'edit'), validate(updateConnectSchema), updateConnect);

export default router;
