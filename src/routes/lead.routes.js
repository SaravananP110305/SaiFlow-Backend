import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  assignLead,
  deleteLead
} from '../controllers/lead.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema
} from '../validators/lead.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('leads', 'view'), getLeads);
router.get('/:id', requirePermission('leads', 'view'), getLeadById);
router.post('/', requirePermission('leads', 'create'), validate(createLeadSchema), createLead);
router.put('/:id', requirePermission('leads', 'edit'), validate(updateLeadSchema), updateLead);
router.patch('/:id/assignment', requirePermission('leads', 'assign'), validate(assignLeadSchema), assignLead);
router.delete('/:id', requirePermission('leads', 'delete'), deleteLead);

export default router;
