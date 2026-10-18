import { Router } from 'express';
import {
  getOverview, getReview, postReview, getLibrary, addToDeck,
  createCard, listCards, editCard, deleteCard, getSuggestions, lookupWord,
} from '../controllers/vocabController.js';
import { protect } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/overview', protect, getOverview);
router.get('/review', protect, getReview);
router.post('/review', protect, postReview);
router.get('/library', protect, getLibrary);
router.post('/deck', protect, addToDeck);
router.get('/cards', protect, listCards);
router.post('/cards', protect, createCard);
router.patch('/cards/:id', protect, editCard);
router.delete('/cards/:id', protect, deleteCard);
router.get('/suggestions', protect, getSuggestions);
// "Fill it in for me" is the only AI call in Vocabulary, so it gets the AI rate limit
router.post('/lookup', protect, aiLimiter, lookupWord);

export default router;
