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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

// Customer endpoints
router.post('/get-customer', requirePermission('clients', 'view'), bodyToQuery, getClients);
router.get('/get-customer/:id', requirePermission('clients', 'view'), getClientById);
router.post('/create-customer', requirePermission('clients', 'create'), validate(createClientSchema), createClient);
router.put('/update-customer/:id', requirePermission('clients', 'edit'), validate(updateClientSchema), updateClient);
router.delete('/delete-customer/:id', requirePermission('clients', 'approve'), deleteClient);

// Project Handover endpoints
router.post('/get-project', requirePermission('clients', 'view'), bodyToQuery, getProjects);
router.post('/create-project', requirePermission('clients', 'create'), validate(createProjectSchema), createProject);
router.put('/update-project/:id', requirePermission('clients', 'edit'), validate(updateProjectSchema), updateProject);

export default router;
