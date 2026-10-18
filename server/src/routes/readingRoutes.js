import { Router } from 'express';
import { listPassages, createSession, listSessions, getSession, deleteSession } from '../controllers/readingController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/passages', protect, listPassages);
router.post('/sessions', protect, createSession);
router.get('/sessions', protect, listSessions);
router.get('/sessions/:id', protect, getSession);
router.delete('/sessions/:id', protect, deleteSession);

export default router;
