// Rewrite/server/routes/user.routes.js
import express from 'express';
import {
       // ... (existing imports)
    //searchUsers,
    saveArticleForUser,      // <-- IMPORT NEW
    unsaveArticleForUser,    // <-- IMPORT NEW
    getSavedArticlesForUser, // <-- IMPORT NEW
    // ... (rest of existing imports)
    getUserProfileByUsername,
    followUser,
    unfollowUser,
    getMyFollowers,
    getMyFollowing,
    getMyPendingFollowRequests,
    respondToFollowRequest,
    removeFollower,
    updateUserProfile,
    toggleAccountPrivacy,
    changeUsername,
    changePassword,
    deleteAccount,
    requestVerification,
    getVerificationRequests,
    approveVerification,
    searchUsers, // <-- IMPORT NEW FUNCTION
} from '../controllers/user.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js'; // Assuming 'admin' is a role check middleware

const router = express.Router();

// --- User Search Route ---
// Placed it near the top for clarity. 'protect' makes it accessible only to logged-in users.
// Remove 'protect' if you want unauthenticated users to be able to search.
router.get('/search', protect, searchUsers);

// --- Public Profile Route (with privacy checks in controller) ---
router.get('/profile/:username', protect, getUserProfileByUsername); // protect is optional if you want unauth users to see public parts

// --- Authenticated User Routes (acting on self or others) ---
router.post('/:userIdToFollow/follow', protect, followUser);
router.post('/:userIdToUnfollow/unfollow', protect, unfollowUser);

// --- Routes for "Me" (current authenticated user) ---
router.get('/me/followers', protect, getMyFollowers);
router.get('/me/following', protect, getMyFollowing);
router.get('/me/pending-requests', protect, getMyPendingFollowRequests);
router.post('/me/pending-requests/:requesterId/respond', protect, respondToFollowRequest); // approve or deny
router.delete('/me/followers/:followerIdToRemove', protect, removeFollower);

router.put('/me/profile', protect, updateUserProfile);
router.put('/me/privacy', protect, toggleAccountPrivacy);
router.put('/me/change-username', protect, changeUsername);
router.put('/me/change-password', protect, changePassword);
router.delete('/me/account', protect, deleteAccount); // Soft delete
router.post('/me/request-verification', protect, requestVerification);

// --- NEW Saved Article Routes for "Me" ---
router.post('/me/saved-articles', protect, saveArticleForUser);
router.get('/me/saved-articles', protect, getSavedArticlesForUser);
router.delete('/me/saved-articles/:savedItemId', protect, unsaveArticleForUser);

// --- Admin Routes for User Management ---
router.get('/admin/verification-requests', protect, admin, getVerificationRequests);
router.post('/admin/verification-requests/:userId/approve', protect, admin, approveVerification);
// Add other admin routes for users if needed (e.g., list all users, ban user, etc.)


export default router;
