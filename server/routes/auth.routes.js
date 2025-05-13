// Rewrite/server/routes/auth.routes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// @route   POST /api/auth/signup
// Pass the array of middleware (validation + controller)
router.post('/signup', registerUser);

// @route   POST /api/auth/login
router.post('/login', loginUser);

// @route   GET /api/auth/me
// 'protect' middleware will run first, then 'getUserProfile'
router.get('/me', protect, getUserProfile);

export default router;
