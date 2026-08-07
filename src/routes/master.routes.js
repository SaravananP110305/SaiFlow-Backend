import { Router } from 'express';
import {
  getMasterItems,
  getMasterItemById,
  createMasterItem,
  updateMasterItem,
  deleteMasterItem
} from '../controllers/master.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createMasterItemSchema,
  updateMasterItemSchema
} from '../validators/master.validator.js';

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-master', bodyToQuery, getMasterItems);
router.get('/get-master/:id', getMasterItemById);
router.post('/create-master', requireRole('Administrator'), validate(createMasterItemSchema), createMasterItem);
router.put('/update-master/:id', requireRole('Administrator'), validate(updateMasterItemSchema), updateMasterItem);
router.delete('/delete-master/:id', requireRole('Administrator'), deleteMasterItem);

export default router;
