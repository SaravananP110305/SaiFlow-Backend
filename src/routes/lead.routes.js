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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

// Note: static/specialized routes must be registered before '/:id'

// Aggregations & bulk operations
router.post('/get-lead-status-counts', requirePermission('leads', 'view'), getLeadStatusCounts);
router.post('/export-lead', requirePermission('leads', 'view'), bodyToQuery, exportLeads);
router.post('/import-lead', requirePermission('leads', 'create'), validate(importLeadsSchema), importLeads);
router.post('/bulk-assign-lead', requirePermission('leads', 'assign'), validate(bulkAssignSchema), bulkAssignLeads);
router.post('/bulk-delete-lead', requirePermission('leads', 'delete'), validate(bulkDeleteSchema), bulkDeleteLeads);

// Standard CRUD
router.post('/get-lead', requirePermission('leads', 'view'), bodyToQuery, getLeads);
router.get('/get-lead/:id', requirePermission('leads', 'view'), getLeadById);
router.post('/create-lead', requirePermission('leads', 'create'), validate(createLeadSchema), createLead);
router.put('/update-lead/:id', requirePermission('leads', 'edit'), validate(updateLeadSchema), updateLead);
router.patch('/assign-lead/:id', requirePermission('leads', 'assign'), validate(assignLeadSchema), assignLead);
router.post('/convert-lead/:id', requirePermission('leads', 'edit'), validate(convertLeadSchema), convertLeadToClient);
router.delete('/delete-lead/:id', requirePermission('leads', 'delete'), deleteLead);

export default router;
