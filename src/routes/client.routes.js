import { Router } from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getProjects,
  createProject,
  updateProject
} from '../controllers/client.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema
} from '../validators/client.validator.js';

const router = Router();

router.use(isAuthenticated);

// Client endpoints
router.get('/', requirePermission('clients', 'view'), getClients);
router.get('/:id', requirePermission('clients', 'view'), getClientById);
router.post('/', requirePermission('clients', 'create'), validate(createClientSchema), createClient);
router.put('/:id', requirePermission('clients', 'edit'), validate(updateClientSchema), updateClient);
router.delete('/:id', requirePermission('clients', 'approve'), deleteClient);

// Project Handover endpoints
router.get('/projects', requirePermission('clients', 'view'), getProjects);
router.post('/projects', requirePermission('clients', 'create'), validate(createProjectSchema), createProject);
router.put('/projects/:id', requirePermission('clients', 'edit'), validate(updateProjectSchema), updateProject);

export default router;
