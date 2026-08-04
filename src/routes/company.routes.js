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

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('companies', 'view'), getCompanies);
router.get('/:id', requirePermission('companies', 'view'), getCompanyById);
router.post('/', requirePermission('companies', 'create'), validate(createCompanySchema), createCompany);
router.put('/:id', requirePermission('companies', 'edit'), validate(updateCompanySchema), updateCompany);
router.delete('/:id', requirePermission('companies', 'delete'), deleteCompany);

export default router;
