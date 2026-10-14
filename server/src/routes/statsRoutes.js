import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { getDashboard } from '../controllers/statsController.js';

const router = Router();
router.get('/dashboard', protect, getDashboard);
export default router;