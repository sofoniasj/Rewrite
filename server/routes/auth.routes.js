import express from 'express';
import { googleLogin } from "../controllers/googleAuth.js";
import {
  login,
  signup,
  googleLogin, // <-- Import
  verifyEmail, // <-- New import
  forgotPassword,
  resetPassword,
  getMe,
  updateUserProfile,
  updateUserPassword,
  deleteUser,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  getAllUsersForAdmin,
  toggleUserStatus
} from '../controllers/auth.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public Routes
router.post('/login', login);
router.post('/signup', signup);
router.get('/verify-email/:token', verifyEmail); // <-- New Verification Route
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Protected Routes
router.route('/me').get(protect, getMe).put(protect, updateUserProfile).delete(protect, deleteUser);
router.put('/update-password', protect, updateUserPassword);

// Follow/Followers
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
router.post('/follow/:userId', protect, followUser);
router.post('/unfollow/:userId', protect, unfollowUser);

router.post("/google", googleLogin);

// Admin Routes
router.get('/admin/users', protect, admin, getAllUsersForAdmin);
router.put('/admin/users/:userId/status', protect, admin, toggleUserStatus);

// --- Email Verification & Password Reset Routes ---
router.get('/verify-email/:token', verifyEmail); // Changed to GET for link clicking, or POST if sending token manually
export default router;