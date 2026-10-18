import { Router } from 'express';
import { getOverview, getLessonByType, getQuiz, createAttempt } from '../controllers/grammarController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// No AI here: lessons are fixed content, the quiz comes from saved mistakes
router.get('/overview', protect, getOverview);
router.get('/lessons/:type', protect, getLessonByType);
router.get('/quiz', protect, getQuiz);
router.post('/attempts', protect, createAttempt);

export default router;
