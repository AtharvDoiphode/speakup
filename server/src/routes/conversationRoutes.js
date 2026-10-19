import { Router } from 'express';
import {
  createConversation,
  getConversation,
  sendMessage,
  endConversation,
  changeDifficulty,
  listConversations,
  deleteConversation,
  retryScorecard,
} from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Anything that calls the AI also gets the AI rate limit
router.get('/', protect, listConversations);
router.post('/', protect, aiLimiter, createConversation);
router.get('/:id', protect, getConversation);
router.post('/:id/messages', protect, aiLimiter, sendMessage);
router.post('/:id/end', protect, endConversation);
router.patch('/:id/difficulty', protect, changeDifficulty);
router.delete('/:id', protect, deleteConversation);
// Calls the AI again, so it gets the AI rate limit
router.post('/:id/scorecard', protect, aiLimiter, retryScorecard);

export default router;
