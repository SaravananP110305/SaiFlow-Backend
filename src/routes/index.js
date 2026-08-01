import { Router } from 'express';
import healthRoutes from './health.routes.js';

const router = Router();

// Base health route
router.use('/health', healthRoutes);

export default router;
