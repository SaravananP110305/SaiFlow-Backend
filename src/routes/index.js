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

const router = Router();

// Base health route
router.use('/health', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Role & Permission Management routes
router.use('/roles', roleRoutes);

// User Management routes
router.use('/users', userRoutes);

// Master Data Management routes
router.use('/master-items', masterRoutes);

// Company Management routes
router.use('/companies', companyRoutes);

// Lead Management routes
router.use('/leads', leadRoutes);

// Meeting Management routes
router.use('/meetings', meetingRoutes);

// Proposal Management routes
router.use('/proposals', proposalRoutes);

// Client & Project Handover routes
router.use('/clients', clientRoutes);

// Contact & Follow-up (Connect) routes
router.use('/connect', connectRoutes);

// Analytics & Reports routes
router.use('/reports', reportRoutes);

// System Settings routes
router.use('/settings', settingsRoutes);

export default router;
