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

import { bodyToQuery } from '../middlewares/bodyToQuery.middleware.js';

const router = Router();

router.use(isAuthenticated);

router.post('/get-proposal', requirePermission('proposals', 'view'), bodyToQuery, getProposals);
router.get('/get-proposal/:id', requirePermission('proposals', 'view'), getProposalById);
router.post('/create-proposal', requirePermission('proposals', 'create'), validate(createProposalSchema), createProposal);
router.put('/update-proposal/:id', requirePermission('proposals', 'edit'), validate(updateProposalSchema), updateProposal);
router.delete('/delete-proposal/:id', requirePermission('proposals', 'delete'), deleteProposal);

export default router;
