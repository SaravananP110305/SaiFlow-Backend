import { Router } from 'express';
import {
  login,
  refresh,
  logout,
  getMe,
  getPrivileges,
  updateProfile,
  changePassword
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema, changePasswordSchema, updateProfileSchema } from '../validators/auth.validator.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.put('/refresh', refresh);
router.delete('/logout', isAuthenticated, logout);
router.get('/me', isAuthenticated, getMe);
router.get('/privileges', isAuthenticated, getPrivileges);
router.patch('/profile', isAuthenticated, validate(updateProfileSchema), updateProfile);
router.patch('/change-password', isAuthenticated, validate(changePasswordSchema), changePassword);

export default router;
