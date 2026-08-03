import { Router } from 'express';
import {
  getProposals,
  getProposalById,
  createProposal,
  updateProposal,
  deleteProposal
} from '../controllers/proposal.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createProposalSchema,
  updateProposalSchema
} from '../validators/proposal.validator.js';

const router = Router();

router.use(isAuthenticated);

router.get('/', requirePermission('proposals', 'view'), getProposals);
router.get('/:id', requirePermission('proposals', 'view'), getProposalById);
router.post('/', requirePermission('proposals', 'create'), validate(createProposalSchema), createProposal);
router.put('/:id', requirePermission('proposals', 'edit'), validate(updateProposalSchema), updateProposal);
router.delete('/:id', requirePermission('proposals', 'delete'), deleteProposal);

export default router;
