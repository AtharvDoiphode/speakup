import { Router } from 'express';
import User from '../models/User.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

// Every route in this file needs a logged-in admin
router.use(protect, adminOnly);

// GET /api/admin/users: list all users, newest first (passwords are never selected)
router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
});

export default router;
