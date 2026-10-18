import { Router } from 'express';
import { createCheck, listChecks, getCheck, deleteCheck } from '../controllers/writingController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Checking calls the AI, so it also gets the AI rate limit
router.post('/check', protect, aiLimiter, createCheck);
router.get('/', protect, listChecks);
router.get('/:id', protect, getCheck);
router.delete('/:id', protect, deleteCheck);

export default router;
