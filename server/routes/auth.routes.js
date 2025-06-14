// Rewrite/server/routes/auth.routes.js
import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  verifyEmail,
  forgotPassword,
  resetPassword
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// --- Main Auth Routes ---
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getUserProfile); // 'protect' middleware ensures user is logged in

// --- Email Verification & Password Reset Routes ---
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword); // PUT is appropriate for updating the password resource

export default router;
