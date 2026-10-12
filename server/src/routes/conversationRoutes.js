import { Router } from 'express';
import {
  createConversation,
  getConversation,
  sendMessage,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Anything that calls the AI also gets the AI rate limit
router.post('/', protect, aiLimiter, createConversation);
router.get('/:id', protect, getConversation);
router.post('/:id/messages', protect, aiLimiter, sendMessage);

export default router;