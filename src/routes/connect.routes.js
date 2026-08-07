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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-connect', requirePermission('connect', 'view'), bodyToQuery, getConnects);
router.post('/create-connect', requirePermission('connect', 'create'), validate(createConnectSchema), createConnect);
router.patch('/update-connect/:id', requirePermission('connect', 'edit'), validate(updateConnectSchema), updateConnect);
router.put('/update-connect/:id', requirePermission('connect', 'edit'), validate(updateConnectSchema), updateConnect);

export default router;
