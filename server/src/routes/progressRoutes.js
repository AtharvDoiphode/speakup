import { Router } from 'express';
import { getProgress } from '../controllers/progressController.js';
import { getHistory } from '../controllers/historyController.js';
import { protect } from '../middleware/auth.js';

// No AI here: everything is counted from what you've already done
export const progressRouter = Router().get('/', protect, getProgress);
export const historyRouter = Router().get('/', protect, getHistory);
