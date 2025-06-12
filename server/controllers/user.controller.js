// Rewrite/server/controllers/user.controller.js
import asyncHandler from 'express-async-handler';
import { body, param, query, validationResult } from 'express-validator';
import User from '../models/user.model.js';
import Content from '../models/content.model.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Added bcryptjs import, it was used in deleteAccount


const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

// @desc    Get user profile by username
// @route   GET /api/users/profile/:username
// @access  Public (with privacy considerations)
const getUserProfileByUsername = asyncHandler(async (req, res, next) => {
    const targetUser = await User.findOne({ username: req.params.username, status: 'active' })
        .select('-passwordHash -agreedToTerms -verificationRequestedAt');

    if (!targetUser) {
        return next(new AppError('User not found', 404));
    }

    let canViewProfile = false;
    const requestingUser = req.user;

    if (!targetUser.isPrivate) {
        canViewProfile = true;
    } else if (requestingUser) {
        if (requestingUser.id === targetUser.id.toString() || requestingUser.role === 'admin') {
            canViewProfile = true;
        } else if ((targetUser.followers || []).some(followerId => followerId.toString() === requestingUser.id)) {
            canViewProfile = true;
        }
    }

    if (canViewProfile) {
        const profileData = targetUser.toJSON();
        profileData.followersCount = (targetUser.followers || []).length;
        profileData.followingCount = (targetUser.following || []).length;
        
        if (requestingUser) {
            profileData.isFollowedByMe = (targetUser.followers || []).some(followerId => followerId.toString() === requestingUser.id);
            if (targetUser.isPrivate) {
                profileData.hasPendingRequestFromMe = (targetUser.pendingFollowRequests || []).some(reqId => reqId.toString() === requestingUser.id);
            } else {
                profileData.hasPendingRequestFromMe = false;
            }
        } else {
            profileData.isFollowedByMe = false;
            profileData.hasPendingRequestFromMe = false;
        }
        if (!requestingUser || (requestingUser.id !== targetUser.id.toString() && requestingUser.role !== 'admin')) {
            delete profileData.followers; delete profileData.following; delete profileData.pendingFollowRequests;
        } else {
            profileData.followers = targetUser.followers || [];
            profileData.following = targetUser.following || [];
            profileData.pendingFollowRequests = targetUser.pendingFollowRequests || [];
        }
        res.json(profileData);
    } else {
        let hasPendingRequest = false; let isFollowed = false;
        if (requestingUser) {
            isFollowed = (targetUser.followers || []).some(followerId => followerId.toString() === requestingUser.id);
            if (!isFollowed) hasPendingRequest = (targetUser.pendingFollowRequests || []).some(reqId => reqId.toString() === requestingUser.id);
        }
        res.json({
            id: targetUser.id, username: targetUser.username, profilePicture: targetUser.profilePicture,
            bio: targetUser.bio, isPrivate: true, isVerified: targetUser.isVerified,
            hasPendingRequestFromMe: hasPendingRequest, isFollowedByMe: isFollowed,
        });
    }
});
const followUser = asyncHandler(async (req, res, next) => { /* ... */ 
    const userIdToFollow = req.params.userIdToFollow; const currentUserId = req.user.id;
    if (userIdToFollow === currentUserId) return next(new AppError("You cannot follow yourself", 400));
    const userToFollow = await User.findById(userIdToFollow); const currentUser = await User.findById(currentUserId);
    if (!userToFollow || !currentUser || userToFollow.status === 'deleted' || currentUser.status === 'deleted') return next(new AppError("User not found", 404));
    if ((currentUser.following || []).includes(userToFollow.id)) return next(new AppError("You are already following this user", 400));
    if (userToFollow.isPrivate && (userToFollow.pendingFollowRequests || []).includes(currentUser.id)) return next(new AppError("Follow request already sent", 400));
    if (userToFollow.isPrivate) { if (!(userToFollow.pendingFollowRequests || []).includes(currentUser.id)) { userToFollow.pendingFollowRequests = [...(userToFollow.pendingFollowRequests || []), currentUser.id]; await userToFollow.save(); res.json({ message: "Follow request sent", pending: true }); } else return next(new AppError("Follow request already sent", 400)); }
    else { currentUser.following = [...(currentUser.following || []), userToFollow.id]; userToFollow.followers = [...(userToFollow.followers || []), currentUser.id]; await currentUser.save(); await userToFollow.save(); res.json({ message: `Successfully followed ${userToFollow.username}`, pending: false }); }
});
const unfollowUser = asyncHandler(async (req, res, next) => { /* ... */ 
    const userIdToUnfollow = req.params.userIdToUnfollow; const currentUserId = req.user.id;
    const userToUnfollow = await User.findById(userIdToUnfollow); const currentUser = await User.findById(currentUserId);
    if (!userToUnfollow || !currentUser || userToUnfollow.status === 'deleted' || currentUser.status === 'deleted') return next(new AppError("User not found", 404));
    currentUser.following = (currentUser.following || []).filter(id => id.toString() !== userToUnfollow.id.toString());
    userToUnfollow.followers = (userToUnfollow.followers || []).filter(id => id.toString() !== currentUser.id.toString());
    userToUnfollow.pendingFollowRequests = (userToUnfollow.pendingFollowRequests || []).filter(id => id.toString() !== currentUser.id.toString());
    await currentUser.save(); await userToUnfollow.save();
    res.json({ message: `Successfully unfollowed ${userToUnfollow.username}` });
});

const getMyFollowers = asyncHandler(async (req, res, next) => { const user = await User.findById(req.user.id).populate('followers', 'id username profilePicture isVerified'); if (!user) return next(new AppError("User not found", 404)); res.json(user.followers || []); });
const getMyFollowing = asyncHandler(async (req, res, next) => { const user = await User.findById(req.user.id).populate('following', 'id username profilePicture isVerified'); if (!user) return next(new AppError("User not found", 404)); res.json(user.following || []); });
const getMyPendingFollowRequests = asyncHandler(async (req, res, next) => { const user = await User.findById(req.user.id).populate('pendingFollowRequests', 'id username profilePicture'); if (!user) return next(new AppError("User not found", 404)); res.json(user.pendingFollowRequests || []); });

const respondToFollowRequest = [
    param('requesterId').isMongoId().withMessage('Invalid requester ID'), body('action').isIn(['approve', 'deny']).withMessage('Action must be "approve" or "deny"'),
    asyncHandler(async (req, res, next) => {
        if(!checkValidation(req, next)) return;
        const requesterId = req.params.requesterId; const myId = req.user.id; const { action } = req.body;
        const me = await User.findById(myId); const requester = await User.findById(requesterId);
        if (!me || !requester || requester.status === 'deleted') return next(new AppError("User not found", 404));
        if (!(me.pendingFollowRequests || []).some(id => id.toString() === requesterId)) return next(new AppError("No pending follow request from this user", 404));
        
        me.pendingFollowRequests = (me.pendingFollowRequests || []).filter(id => id.toString() !== requesterId);

        if (action === 'approve') {
            if (!(me.followers || []).includes(requesterId)) me.followers = [...(me.followers || []), requesterId];
            if (!(requester.following || []).includes(myId)) requester.following = [...(requester.following || []), myId];
            await requester.save();
            await me.save();
            res.json({ message: `Follow request from ${requester.username} approved.` });
        } else {
            await me.save();
            res.json({ message: `Follow request from ${requester.username} denied.` });
        }
    })
];

const removeFollower = asyncHandler(async (req, res, next) => {
    const followerIdToRemove = req.params.followerIdToRemove; const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId); const followerToRemove = await User.findById(followerIdToRemove);
    if (!currentUser || !followerToRemove || followerToRemove.status === 'deleted') return next(new AppError("User not found", 404));
    currentUser.followers = (currentUser.followers || []).filter(id => id.toString() !== followerIdToRemove.toString());
    followerToRemove.following = (followerToRemove.following || []).filter(id => id.toString() !== currentUserId.toString());
    await currentUser.save(); await followerToRemove.save();
    res.json({ message: `${followerToRemove.username} has been removed from your followers.` });
});

const updateUserProfile = [
    body('bio').optional().isString().isLength({ max: 160 }).withMessage('Bio cannot exceed 160 characters'),
    body('profilePicture').optional({checkFalsy: true}).isURL().withMessage('Profile picture must be a valid URL'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const user = await User.findById(req.user.id);
        if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
        if (req.body.bio !== undefined) user.bio = req.body.bio;
        if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;
        const updatedUser = await user.save();
        // Return full profile data on update
        const profileData = updatedUser.toJSON();
        profileData.followersCount = (updatedUser.followers || []).length;
        profileData.followingCount = (updatedUser.following || []).length;
        profileData.isFollowedByMe = false; // Not relevant when updating own profile
        profileData.hasPendingRequestFromMe = false; // Not relevant
        res.json(profileData);
    })
];

// --- UPDATED toggleAccountPrivacy function with DEBUGGING LOGS ---
const toggleAccountPrivacy = [
    body('isPrivate').isBoolean().withMessage('isPrivate must be a boolean value'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;

        const userId = req.user.id;
        const { isPrivate: newPrivacyState } = req.body;

        // Find the user first to get their pending requests if we're making the account public
        const userBeforeUpdate = await User.findById(userId);
        if (!userBeforeUpdate) {
            return next(new AppError("User not found", 404));
        }

        // Prepare the update payload
        const updatePayload = { isPrivate: newPrivacyState };

        // Handle auto-approval logic if making account public
        if (newPrivacyState === false && (userBeforeUpdate.pendingFollowRequests || []).length > 0) {
            const pendingIds = userBeforeUpdate.pendingFollowRequests;
            
            // Add pending users to my followers list AND clear my pending list in one go
            updatePayload.$addToSet = { followers: { $each: pendingIds } };
            updatePayload.pendingFollowRequests = [];

            // This updates OTHER users to add the current user to their 'following' list.
            // This is a "fire and forget" operation; its success/failure won't block the main response.
            User.updateMany(
                { _id: { $in: pendingIds } },
                { $addToSet: { following: userBeforeUpdate._id } }
            ).exec();
        }

        // Perform the main update for the current user using findByIdAndUpdate
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updatePayload,
            { new: true, runValidators: true } // `new: true` returns the modified document
        );
        
        if (!updatedUser) {
             return next(new AppError("Could not update user privacy setting", 500));
        }

        res.json({
            message: `Account privacy set to ${updatedUser.isPrivate ? 'Private' : 'Public'}`,
            isPrivate: updatedUser.isPrivate // Return the confirmed new state from the database
        });
    })
];
// --- END OF UPDATE ---

const changeUsername = [
    body('newUsername').trim().isLength({ min: 3, max: 30 }).withMessage('New username must be 3-30 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain alphanumeric characters and underscores'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { newUsername } = req.body; const userId = req.user.id;
        if (newUsername.toLowerCase().includes('deleted account')) return next(new AppError('This username pattern is reserved.', 400));
        const existingUser = await User.findOne({ username: newUsername }); if (existingUser && existingUser.id.toString() !== userId) return next(new AppError('Username already taken', 400));
        const user = await User.findById(userId); if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
        if (user.username === newUsername) return next(new AppError('New username cannot be the same as the current one.', 400));
        user.username = newUsername; await user.save(); res.json({ message: 'Username changed successfully', username: user.username });
    })
];

const changePassword = [
    body('currentPassword').notEmpty().withMessage('Current password is required'), body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'), body('confirmNewPassword').custom((value, { req }) => { if (value !== req.body.newPassword) throw new Error('New passwords do not match'); return true; }),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { currentPassword, newPassword } = req.body; const user = await User.findById(req.user.id);
        if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
        if (!(await user.matchPassword(currentPassword))) return next(new AppError('Incorrect current password', 401));
        if (currentPassword === newPassword) return next(new AppError('New password cannot be the same as the current one.', 400));
        user.passwordHash = newPassword; await user.save(); res.json({ message: 'Password changed successfully' });
    })
];

const deleteAccount = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user || user.status === 'deleted') {
        return next(new AppError("User not found or already deleted", 404));
    }

    if (user.username.toLowerCase() !== 'deleted account' && !user.username.toLowerCase().startsWith('deleted_account_')) {
        user.originalUsername = user.username;
    }
    // UPDATED USERNAME FORMAT
    user.username = `Deleted_Account_${user.id.toString().slice(-6)}`;
    user.bio = "This account has been deleted.";
    user.profilePicture = "";
    user.isPrivate = true;
    user.status = 'deleted';
    user.role = 'deleted';
    user.passwordHash = await bcrypt.hash(Date.now().toString() + Math.random().toString() + user.id.toString(), 12); // Ensure unique hash

    user.followers = [];
    user.following = [];
    user.pendingFollowRequests = [];
    user.savedArticles = [];
    user.verificationRequestedAt = undefined; // Clear this field

    await user.save();
    res.json({ message: 'Account deleted successfully. You have been logged out.' });
});

const requestVerification = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id); if (!user || user.status === 'deleted') return next(new AppError("User not found", 404)); if (user.isVerified) return next(new AppError("Account is already verified", 400)); if (user.verificationRequestedAt && (new Date() - new Date(user.verificationRequestedAt) < 1000 * 60 * 60 * 24 * 7) ) return next(new AppError("You have recently requested verification. Please wait.", 400));
    user.verificationRequestedAt = new Date(); await user.save(); res.json({ message: 'Verification request submitted. An admin will review it.' });
});

const getVerificationRequests = asyncHandler(async (req, res, next) => { const requests = await User.find({ verificationRequestedAt: { $ne: null }, isVerified: false, status: 'active' }).select('id username profilePicture verificationRequestedAt createdAt').sort({ verificationRequestedAt: 1 }); res.json(requests || []); });

const approveVerification = [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const user = await User.findById(req.params.userId); if (!user || user.status === 'deleted') return next(new AppError("User not found", 404)); if (user.isVerified) return next(new AppError("User is already verified", 400));
        user.isVerified = true; user.verificationRequestedAt = null; await user.save(); res.json({ message: `${user.username} has been verified.` });
    })
];

const searchUsers = [
    query('q').trim().notEmpty().withMessage('Search query cannot be empty.').isLength({ min: 1, max: 50 }).withMessage('Search query must be between 1 and 50 characters.'),
    asyncHandler(async (req, res, next) => {
        if(!checkValidation(req, next)) return;
        const searchQuery = req.query.q; const currentUserId = req.user ? req.user.id : null;
        const users = await User.find({ username: { $regex: searchQuery, $options: 'i' }, status: 'active', _id: { $ne: currentUserId } }).limit(20).select('id username profilePicture isVerified isPrivate followers pendingFollowRequests');
        if (!users) return res.json([]);
        const results = users.map(userDoc => {
            const userJSON = userDoc.toJSON();
            userJSON.isFollowedByMe = false;
            userJSON.hasPendingRequestFromMe = false;
            if (currentUserId) {
                userJSON.isFollowedByMe = (userDoc.followers || []).some(followerId => followerId.toString() === currentUserId);
                if (userDoc.isPrivate) {
                    userJSON.hasPendingRequestFromMe = (userDoc.pendingFollowRequests || []).some(reqId => reqId.toString() === currentUserId);
                }
            }
            delete userJSON.followers; // Don't send full arrays in search results
            delete userJSON.pendingFollowRequests;
            return userJSON;
        });
        res.json(results);
    })
];

// @desc    Save an article/lineage for the current user
// @route   POST /api/users/me/saved-articles
// @access  Private
const saveArticleForUser = [
    body('rootArticleId').isMongoId().withMessage('Valid root article ID is required.'),
    body('lineagePathIds').isArray({ min: 1 }).withMessage('Lineage path IDs array is required and cannot be empty.'),
    body('lineagePathIds.*').isMongoId().withMessage('Each lineage path ID must be a valid Mongo ID.'),
    body('customName').optional().trim().isLength({ max: 100 }).withMessage('Custom name cannot exceed 100 characters.'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { rootArticleId, lineagePathIds, customName } = req.body; const userId = req.user.id;
        const user = await User.findById(userId); if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
        const contentItemsExist = await Content.countDocuments({ '_id': { $in: lineagePathIds.map(id => new mongoose.Types.ObjectId(id)) } });
        if (contentItemsExist !== lineagePathIds.length) return next(new AppError("One or more articles in the lineage path do not exist.", 404));
        if (lineagePathIds[0].toString() !== rootArticleId.toString()) return next(new AppError("Root article ID must be the first ID in the lineage path.", 400));
        
        const alreadySaved = (user.savedArticles || []).find(sa => sa.rootArticle.toString() === rootArticleId && sa.lineagePathIds?.join(',') === lineagePathIds.join(','));
        if (alreadySaved) return next(new AppError("This exact lineage path is already saved.", 400));
        
        const newSavedItem = { rootArticle: rootArticleId, lineagePathIds: lineagePathIds, customName: customName || `Saved Path from ${new Date().toLocaleDateString()}`};
        user.savedArticles.push(newSavedItem); await user.save();
        const addedItem = user.savedArticles[user.savedArticles.length - 1];
        res.status(201).json({ message: "Lineage saved successfully.", savedItem: addedItem });
    })
];

// @desc    Unsave an article/lineage for the current user
// @route   DELETE /api/users/me/saved-articles/:savedItemId
// @access  Private
const unsaveArticleForUser = [
    param('savedItemId').isMongoId().withMessage('Valid saved item ID is required.'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { savedItemId } = req.params; const userId = req.user.id;
        const user = await User.findById(userId); if (!user || user.status === 'deleted') return next(new AppError("User not found", 404));
        const initialLength = (user.savedArticles || []).length;
        user.savedArticles.pull({ _id: savedItemId }); // Mongoose .pull() method
        if ((user.savedArticles || []).length === initialLength) return next(new AppError("Saved item not found or already unsaved.", 404));
        await user.save(); res.json({ message: "Article/lineage unsaved successfully." });
    })
];

// @desc    Get all saved articles/lineages for the current user
// @route   GET /api/users/me/saved-articles
// @access  Private
const getSavedArticlesForUser = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const user = await User.findById(userId)
        .populate({
            path: 'savedArticles.rootArticle',
            select: 'id title author text createdAt isPrivateToFollowers likeCount', // Added likeCount
            populate: { path: 'author', select: 'id username profilePicture isVerified' } // Added profilePicture, isVerified
        })
        .populate({
            path: 'savedArticles.lineagePathIds',
            select: 'id text author createdAt likeCount', // Added likeCount
            populate: { path: 'author', select: 'id username profilePicture isVerified' }
        })
        .select('savedArticles -_id');

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    let populatedSavedArticles = user.savedArticles || [];

    // Filter out items where rootArticle is null (meaning it couldn't be populated, likely deleted)
    // Also ensure lineagePathIds has at least one valid item if rootArticle is present
    populatedSavedArticles = populatedSavedArticles.filter(item => 
        item.rootArticle !== null && 
        item.lineagePathIds && 
        item.lineagePathIds.length > 0 &&
        item.lineagePathIds.every(segment => segment !== null) // Ensure all segments in path are populated
    );
    
    const sortedSavedArticles = populatedSavedArticles.sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt));

    res.json(sortedSavedArticles);
});


export {
    getUserProfileByUsername, followUser, unfollowUser, getMyFollowers, getMyFollowing,
    getMyPendingFollowRequests, respondToFollowRequest, removeFollower, updateUserProfile,
    toggleAccountPrivacy, changeUsername, changePassword, deleteAccount, requestVerification,
    getVerificationRequests, approveVerification, searchUsers, saveArticleForUser,
    unsaveArticleForUser, getSavedArticlesForUser,
};
