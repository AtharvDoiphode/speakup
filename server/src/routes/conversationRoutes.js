import { Router } from 'express';
import { createConversation } from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Starting a conversation calls the AI, so it gets the AI rate limit too
router.post('/', protect, aiLimiter, createConversation);

export default router;