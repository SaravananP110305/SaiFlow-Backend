import { Router } from 'express';
import {
  getDashboardSummary,
  getLeadReport,
  getMeetingReport,
  getEmployeeReport,
  getProposalReport
} from '../controllers/report.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.get('/dashboard-summary', getDashboardSummary);
router.get('/leads', requirePermission('reports', 'view'), getLeadReport);
router.get('/meetings', requirePermission('reports', 'view'), getMeetingReport);
router.get('/employees', requirePermission('reports', 'view'), getEmployeeReport);
router.get('/proposals', requirePermission('reports', 'view'), getProposalReport);

export default router;
