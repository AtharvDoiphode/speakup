import { Router } from 'express';
import { correctText } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Order matters: first check login, then the rate limit, then run the controller
router.post('/correct', protect, aiLimiter, correctText);

export default router;