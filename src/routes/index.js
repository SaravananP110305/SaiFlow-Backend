import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import roleRoutes from './role.routes.js';
import userRoutes from './user.routes.js';
import masterRoutes from './master.routes.js';
import companyRoutes from './company.routes.js';
import leadRoutes from './lead.routes.js';
import meetingRoutes from './meeting.routes.js';
import proposalRoutes from './proposal.routes.js';
import clientRoutes from './client.routes.js';
import connectRoutes from './connect.routes.js';
import reportRoutes from './report.routes.js';
import settingsRoutes from './settings.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

// Base health route
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Role & Permission Management routes
router.use('/', roleRoutes);

// User Management routes
router.use('/', userRoutes);

// Master Data Management routes
router.use('/', masterRoutes);

// Company Management routes
router.use('/', companyRoutes);

// Lead Management routes
router.use('/', leadRoutes);

// Meeting Management routes
router.use('/', meetingRoutes);

// Proposal Management routes
router.use('/', proposalRoutes);

// Client & Project Handover routes
router.use('/', clientRoutes);

// Contact & Follow-up (Connect) routes
router.use('/', connectRoutes);

// Analytics & Reports routes
router.use('/', reportRoutes);

// System Settings routes
router.use('/', settingsRoutes);

// Notification routes
router.use('/', notificationRoutes);

export default router;
