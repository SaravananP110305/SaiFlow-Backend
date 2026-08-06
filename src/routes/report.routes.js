import { Router } from 'express';
import {
  getDashboardSummary,
  getDashboardCharts,
  getLeadReport,
  getMeetingReport,
  getEmployeeReport,
  getClientReport,
  getProposalReport,
  getFollowUpReport
} from '../controllers/report.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.get('/dashboard-summary', getDashboardSummary);
router.get('/dashboard-charts', getDashboardCharts);
router.get('/leads', requirePermission('reports', 'view'), getLeadReport);
router.get('/meetings', requirePermission('reports', 'view'), getMeetingReport);
router.get('/employees', requirePermission('reports', 'view'), getEmployeeReport);
router.get('/clients', requirePermission('reports', 'view'), getClientReport);
router.get('/proposals', requirePermission('reports', 'view'), getProposalReport);
router.get('/follow-ups', requirePermission('reports', 'view'), getFollowUpReport);

export default router;
