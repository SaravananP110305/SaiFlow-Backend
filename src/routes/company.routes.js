import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} from '../controllers/company.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator.js';

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-company', requirePermission('companies', 'view'), bodyToQuery, getCompanies);
router.get('/get-company/:id', requirePermission('companies', 'view'), getCompanyById);
router.post('/create-company', requirePermission('companies', 'create'), validate(createCompanySchema), createCompany);
router.put('/update-company/:id', requirePermission('companies', 'edit'), validate(updateCompanySchema), updateCompany);
router.delete('/delete-company/:id', requirePermission('companies', 'delete'), deleteCompany);

export default router;
