import { Router } from 'express';
import { listScenarios } from '../controllers/conversationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, listScenarios);

export default router;