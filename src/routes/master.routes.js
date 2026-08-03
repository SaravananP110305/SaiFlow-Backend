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

const router = Router();

router.use(isAuthenticated);

router.get('/', getMasterItems);
router.get('/:id', getMasterItemById);
router.post('/', requireRole('Administrator'), validate(createMasterItemSchema), createMasterItem);
router.put('/:id', requireRole('Administrator'), validate(updateMasterItemSchema), updateMasterItem);
router.delete('/:id', requireRole('Administrator'), deleteMasterItem);

export default router;
