import { Router } from 'express';
import { register, login, logout, me, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, me);
router.post('/change-password', protect, authLimiter, changePassword);

export default router;
