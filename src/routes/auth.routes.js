import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  getMe,
  changePassword
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, changePasswordSchema } from '../validators/auth.validator.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/sessions', validate(loginSchema), login);
router.put('/sessions', refresh);
router.delete('/sessions', isAuthenticated, logout);
router.get('/profile', isAuthenticated, getMe);
router.patch('/profile/password', isAuthenticated, validate(changePasswordSchema), changePassword);

export default router;
