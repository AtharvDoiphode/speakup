import { Router } from 'express';
import { listPassages, createSession, listSessions } from '../controllers/readingController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/passages', protect, listPassages);
router.post('/sessions', protect, createSession);
router.get('/sessions', protect, listSessions);

export default router;
