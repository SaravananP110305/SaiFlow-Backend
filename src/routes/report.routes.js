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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-report-dashboard-summary', bodyToQuery, getDashboardSummary);
router.post('/get-report-dashboard-charts', bodyToQuery, getDashboardCharts);
router.post('/get-report-lead', requirePermission('reports', 'view'), bodyToQuery, getLeadReport);
router.post('/get-report-meeting', requirePermission('reports', 'view'), bodyToQuery, getMeetingReport);
router.post('/get-report-employee', requirePermission('reports', 'view'), bodyToQuery, getEmployeeReport);
router.post('/get-report-customer', requirePermission('reports', 'view'), bodyToQuery, getClientReport);
router.post('/get-report-proposal', requirePermission('reports', 'view'), bodyToQuery, getProposalReport);
router.post('/get-report-follow-up', requirePermission('reports', 'view'), bodyToQuery, getFollowUpReport);

export default router;
