import { Router } from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  assignLead,
  deleteLead,
  getLeadStatusCounts,
  bulkAssignLeads,
  bulkDeleteLeads,
  importLeads,
  exportLeads,
  convertLeadToClient
} from '../controllers/lead.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  importLeadsSchema,
  bulkAssignSchema,
  bulkDeleteSchema,
  convertLeadSchema
} from '../validators/lead.validator.js';

const router = Router();

router.use(isAuthenticated);

// Note: static/specialized routes must be registered before '/:id'

// Aggregations & bulk operations
router.get('/status-counts', requirePermission('leads', 'view'), getLeadStatusCounts);
router.get('/export', requirePermission('leads', 'view'), exportLeads);
router.post('/import', requirePermission('leads', 'create'), validate(importLeadsSchema), importLeads);
router.post('/bulk-assign', requirePermission('leads', 'assign'), validate(bulkAssignSchema), bulkAssignLeads);
router.post('/bulk-delete', requirePermission('leads', 'delete'), validate(bulkDeleteSchema), bulkDeleteLeads);

// Standard CRUD
router.get('/', requirePermission('leads', 'view'), getLeads);
router.get('/:id', requirePermission('leads', 'view'), getLeadById);
router.post('/', requirePermission('leads', 'create'), validate(createLeadSchema), createLead);
router.put('/:id', requirePermission('leads', 'edit'), validate(updateLeadSchema), updateLead);
router.patch('/:id/assignment', requirePermission('leads', 'assign'), validate(assignLeadSchema), assignLead);
router.post('/:id/convert', requirePermission('leads', 'edit'), validate(convertLeadSchema), convertLeadToClient);
router.delete('/:id', requirePermission('leads', 'delete'), deleteLead);

export default router;
