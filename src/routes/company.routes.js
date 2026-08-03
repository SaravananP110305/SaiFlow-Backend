import { Router } from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} from '../controllers/company.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createCompanySchema, updateCompanySchema } from '../validators/company.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/', validate(createCompanySchema), createCompany);
router.put('/:id', validate(updateCompanySchema), updateCompany);
router.delete('/:id', deleteCompany);

export default router;
