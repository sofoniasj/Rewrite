// Rewrite/server/controllers/content.controller.js
import asyncHandler from 'express-async-handler';
import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Content from '../models/content.model.js';
import User from '../models/user.model.js';
import AppError from '../utils/AppError.js';

// Helper
const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

// @desc    Get content, filterable and sortable
// @route   GET /api/content
// @access  Public
const getFilteredContent = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const view = req.query.view;
  const feedType = req.query.feedType;
  const sortBy = req.query.sortBy;

  const filter = {};
  if (req.query.parentContent === 'null') filter.parentContent = null;
  else if (mongoose.Types.ObjectId.isValid(req.query.parentContent)) filter.parentContent = req.query.parentContent;
  else if (!req.query.parentContent) filter.parentContent = null;

  if (feedType === 'popular' || (filter.parentContent === null && !feedType && sortBy !== 'truePopularity_desc')) {
    filter.isPrivateToFollowers = false;
  }
  if (sortBy === 'truePopularity_desc') {
      filter.parentContent = null;
      filter.isPrivateToFollowers = false;
  }

  let articles = [];
  let totalArticles = 0;
  let selection = 'id title text author parentContent createdAt updatedAt likeCount likes isPrivateToFollowers reports isReported';
  if (view === 'titles' && filter.parentContent === null) {
    selection = 'id title author createdAt isPrivateToFollowers likeCount';
  }

  if (sortBy === 'truePopularity_desc') {
    const aggregationPipeline = [
      { $match: { parentContent: null, isPrivateToFollowers: false } },
      { $graphLookup: { from: 'contents', startWith: '$_id', connectFromField: '_id', connectToField: 'parentContent', as: 'lineage' }},
      { $addFields: { truePopularityScore: { $add: [ '$likeCount', { $sum: { $map: { input: '$lineage', as: 'descendant', in: '$$descendant.likeCount' } } } ]}}},
      { $sort: { truePopularityScore: -1, createdAt: -1 } },
      { $facet: {
          paginatedResults: [
            { $skip: skip }, { $limit: limit },
            { $lookup: { from: 'users', localField: 'author', foreignField: '_id', as: 'authorInfo' }},
            { $unwind: { path: '$authorInfo', preserveNullAndEmptyArrays: true } },
            { $project: {
                _id: 1, id: '$_id', title: 1, text: 1, parentContent: 1, createdAt: 1, updatedAt: 1,
                likeCount: 1, likes:1, isPrivateToFollowers: 1, reports:1, isReported: 1, truePopularityScore: 1,
                author: { _id: '$authorInfo._id', id: '$authorInfo._id', username: '$authorInfo.username', profilePicture: '$authorInfo.profilePicture', isVerified: '$authorInfo.isVerified' },
              }}
          ],
          totalCount: [ { $count: 'count' } ]
        }}
    ];
    const results = await Content.aggregate(aggregationPipeline);
    articles = results[0].paginatedResults.map(doc => ({...doc, id: doc._id.toString()}));
    totalArticles = results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;
  } else {
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'likes_desc' || feedType === 'popular') sortOptions = { likeCount: -1, createdAt: -1 };
    else if (sortBy === 'createdAt_asc') sortOptions = { createdAt: 1 };
    const articlesQuery = Content.find(filter).sort(sortOptions).skip(skip).limit(limit)
      .populate('author', 'username profilePicture isVerified').select(selection);
    articles = await articlesQuery;
    totalArticles = await Content.countDocuments(filter);
  }
  res.json({ articles, page, pages: Math.ceil(totalArticles / limit), totalArticles });
});

const getMyPageFeed = asyncHandler(async (req, res, next) => {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    console.log(`MyPageFeed: User ${currentUserId}, Page ${page}, Limit ${limit}`); // DEBUG

    const currentUser = await User.findById(currentUserId).select('following');
    if (!currentUser || !currentUser.following || currentUser.following.length === 0) {
        console.log("MyPageFeed: User not found or not following anyone."); // DEBUG
        return res.json({ articles: [], page: 1, pages: 0, totalArticles: 0 });
    }
    const followedUserIds = currentUser.following;
    console.log("MyPageFeed: Following User IDs:", followedUserIds); // DEBUG
    const filter = { author: { $in: followedUserIds }, parentContent: null };

    const articles = await Content.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('author', 'username profilePicture isVerified')
        .select('id title text author parentContent createdAt updatedAt likeCount likes isPrivateToFollowers reports isReported');
    const totalArticles = await Content.countDocuments(filter);
    console.log(`MyPageFeed: Found ${articles.length} articles, Total ${totalArticles}`); // DEBUG
    res.json({ articles, page, pages: Math.ceil(totalArticles / limit), totalArticles });
});

const getExploreFeed = asyncHandler(async (req, res, next) => {
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    console.log(`ExploreFeed: User ${currentUserId}, Page ${page}, Limit ${limit}`); // DEBUG

    const currentUser = await User.findById(currentUserId).select('following');
    const myFollowingObjectIds = currentUser ? currentUser.following : [];

    const secondDegreeUsers = await User.aggregate([
        { $match: { _id: { $in: myFollowingObjectIds } } },
        { $lookup: { from: 'users', localField: 'following', foreignField: '_id', as: 'secondDegreeFollowingArr' }},
        { $unwind: '$secondDegreeFollowingArr' },
        { $replaceRoot: { newRoot: '$secondDegreeFollowingArr' } },
        { $match: { _id: { $nin: [new mongoose.Types.ObjectId(currentUserId), ...myFollowingObjectIds] }, status: 'active', isPrivate: false }},
        { $group: { _id: '$_id' } }, { $project: { _id: 1 } }
    ]);
    const secondDegreeUserIds = secondDegreeUsers.map(u => u._id);
    console.log("ExploreFeed: 2nd Degree User IDs:", secondDegreeUserIds.length); // DEBUG

    let articles = [];
    let totalArticles = 0;
    let feedResultType = 'second_degree';

    if (secondDegreeUserIds.length > 0) {
        const exploreFilter = { author: { $in: secondDegreeUserIds }, parentContent: null, isPrivateToFollowers: false };
        articles = await Content.find(exploreFilter).sort({ createdAt: -1 }).skip(skip).limit(limit)
            .populate('author', 'username profilePicture isVerified')
            .select('id title text author parentContent createdAt updatedAt likeCount likes isPrivateToFollowers reports isReported');
        totalArticles = await Content.countDocuments(exploreFilter);
    }
    
    if (!articles || articles.length < limit) {
        const articlesNeeded = limit - (articles ? articles.length : 0);
        if (articlesNeeded > 0) {
            feedResultType = articles && articles.length > 0 ? 'second_degree_with_fallback' : 'popular_fallback';
            const existingAuthorIds = articles ? articles.map(a => a.author.id.toString()) : [];
            const popularExploreFilter = {
                author: { $nin: [currentUserId, ...myFollowingObjectIds.map(id=>id.toString()), ...secondDegreeUserIds.map(id=>id.toString()), ...existingAuthorIds] },
                parentContent: null, isPrivateToFollowers: false,
            };
            const fallbackArticles = await Content.find(popularExploreFilter).sort({ likeCount: -1, createdAt: -1 }).limit(articlesNeeded)
                .populate('author', 'username profilePicture isVerified')
                .select('id title text author parentContent createdAt updatedAt likeCount likes isPrivateToFollowers reports isReported');
            articles = articles ? [...articles, ...fallbackArticles] : fallbackArticles;
            if (feedResultType === 'popular_fallback') totalArticles = await Content.countDocuments(popularExploreFilter);
            else totalArticles = articles.length + ( (page === Math.ceil(totalArticles/limit)) ? 0 : articlesNeeded);
        }
    }
    console.log(`ExploreFeed: Found ${articles.length} articles, Type: ${feedResultType}`); // DEBUG
    res.json({ articles, page, pages: Math.ceil(totalArticles / limit), totalArticles, type: feedResultType });
});

// @desc    Get a single content item by ID
// @route   GET /api/content/:id
// @access  Public
const getContentById = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const content = await Content.findById(req.params.id)
      .populate('author', 'username profilePicture isVerified') // Added profilePicture, isVerified
      .populate('likes', 'id username'); // For checking if current user liked
    if (!content) return next(new AppError('Content not found', 404));
    res.json(content);
  }),
];

// @desc    Get content lineage for "Read" page
// @route   GET /api/content/:id/lineage
// @access  Public
const getContentLineage = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const lineage = []; let currentContentId = req.params.id; const MAX_DEPTH = 15;
    for (let i = 0; i < MAX_DEPTH && currentContentId; i++) {
      const contentItem = await Content.findById(currentContentId)
        .populate('author', 'username profilePicture isVerified')
        .select('id title text author parentContent createdAt updatedAt likeCount likes isPrivateToFollowers reports isReported'); // Ensure all needed fields
      if (!contentItem) break;
      lineage.push(contentItem);
      const topChild = await Content.findOne({ parentContent: contentItem.id, isPrivateToFollowers: false }) // Consider privacy for children in lineage
        .sort({ likeCount: -1, createdAt: 1 })
        .select('id');
      currentContentId = topChild ? topChild.id : null;
    }
    if (lineage.length === 0) return next(new AppError('Content not found or lineage could not be constructed', 404));
    res.json(lineage);
  }),
];

// @desc    Get alternative versions (siblings) of a content item
// @route   GET /api/content/:id/versions
// @access  Public
const getContentVersions = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const contentItem = await Content.findById(req.params.id).select('parentContent');
    if (!contentItem || !contentItem.parentContent) return res.json([]);
    const versions = await Content.find({
        parentContent: contentItem.parentContent,
        _id: { $ne: req.params.id },
        isPrivateToFollowers: false // Only show public siblings as alternatives by default
    })
      .sort({ likeCount: -1, createdAt: 1 })
      .populate('author', 'username profilePicture isVerified')
      .select('id title text author parentContent createdAt updatedAt likeCount likes isPrivateToFollowers reports isReported');
    res.json(versions);
  }),
];

// @desc    Create new content (article or reply)
// @route   POST /api/content
// @access  Private
const createContent = [
    body('text').trim().isLength({ min: 1, max: 10000 }).withMessage('Content text must be between 1 and 10000 characters'),
    body('title').optional().trim().isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
    body('parentContent').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid parentContent ID format'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { title, text, parentContent } = req.body;
        const newContentData = { author: req.user.id, text: text.trim() };
        if (title && !parentContent) newContentData.title = title.trim();
        if (parentContent) { const parent = await Content.findById(parentContent); if (!parent) return next(new AppError('Parent content not found', 404)); newContentData.parentContent = parentContent; }
        const content = await Content.create(newContentData);
        const populatedContent = await Content.findById(content.id).populate('author', 'username profilePicture isVerified').populate('likes', 'id username');
        res.status(201).json(populatedContent);
    }),
];

// @desc    Update existing content
// @route   PUT /api/content/:id
// @access  Private (author only)
const updateContent = [
    param('id').isMongoId().withMessage('Invalid content ID format'),
    body('text').trim().isLength({ min: 1, max: 10000 }).withMessage('Content text must be between 1 and 10000 characters'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { text } = req.body; const content = await Content.findById(req.params.id);
        if (!content) return next(new AppError('Content not found', 404));
        if (content.author.toString() !== req.user.id.toString() && req.user.role !== 'admin') { // Allow admin to edit
            return next(new AppError('User not authorized to update this content', 403));
        }
        content.text = text.trim();
        const updatedContent = await content.save();
        const populatedContent = await Content.findById(updatedContent.id).populate('author', 'username profilePicture isVerified').populate('likes', 'id username');
        res.json(populatedContent);
    }),
];

// @desc    Toggle like/unlike on content
// @route   POST /api/content/:id/like
// @access  Private
const toggleLikeContent = [
    param('id').isMongoId().withMessage('Invalid content ID format'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const content = await Content.findById(req.params.id); if (!content) return next(new AppError('Content not found', 404));
        const userId = req.user.id; const alreadyLikedIndex = content.likes.findIndex(like => like.toString() === userId.toString());
        if (alreadyLikedIndex > -1) content.likes.splice(alreadyLikedIndex, 1); else content.likes.push(userId);
        await content.save(); // Pre-save hook updates likeCount
        res.json({ id: content.id, likes: content.likes, likeCount: content.likeCount });
    }),
];

// @desc    Report content
// @route   POST /api/content/:id/report
// @access  Private
const reportContent = [
    param('id').isMongoId().withMessage('Invalid content ID format'),
    body('reason').optional().trim().isLength({ max: 200 }).withMessage('Report reason cannot exceed 200 characters'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const { reason } = req.body; const content = await Content.findById(req.params.id); if (!content) return next(new AppError('Content not found', 404));
        const userId = req.user.id; const alreadyReported = content.reports.find(report => report.reporter.toString() === userId.toString());
        if (alreadyReported) return next(new AppError('You have already reported this content', 400));
        content.reports.push({ reporter: userId, reason: reason || "No reason provided" });
        await content.save(); // Pre-save hook updates isReported
        res.json({ message: 'Content reported successfully', contentId: content.id, isReported: content.isReported, reportsCount: content.reports.length });
    }),
];

// @desc    Un-report content (remove current user's report)
// @route   DELETE /api/content/:id/report
// @access  Private
const unreportContent = [
    param('id').isMongoId().withMessage('Invalid content ID format'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;

        const contentId = req.params.id;
        const currentUserId = req.user.id;

        const content = await Content.findById(contentId);

        if (!content) {
            return next(new AppError('Content not found', 404));
        }

        const reportIndex = content.reports.findIndex(
            report => report.reporter.toString() === currentUserId.toString()
        );

        if (reportIndex === -1) {
            // This case implies the user hadn't reported it, or it was already removed.
            // For a toggle, this might mean the frontend state was out of sync.
            // Returning a success-like response with current state can help frontend sync.
            return res.json({
                message: 'No active report by you found for this content.',
                contentId: content.id,
                isReported: content.isReported,
                reportsCount: content.reports.length,
                currentUserReported: false
            });
        }

        content.reports.splice(reportIndex, 1);
        // The pre-save hook on the Content model will update 'isReported' and 'updatedAt'
        await content.save();

        res.json({
            message: 'Your report has been removed.',
            contentId: content.id,
            isReported: content.isReported, // The global reported status
            reportsCount: content.reports.length,
            currentUserReported: false // For immediate UI update
        });
    })
];


// @desc    Get articles by a specific user ID
// @route   GET /api/content/user/:userId
// @access  Public (controller filters based on privacy and follower status)
const getArticlesByUser = [
    param('userId').isMongoId().withMessage('Invalid user ID format'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const authorId = req.params.userId; const page = parseInt(req.query.page, 10) || 1; const limit = parseInt(req.query.limit, 10) || 15; const skip = (page - 1) * limit;
        const authorProfile = await User.findById(authorId).select('isPrivate followers'); if (!authorProfile) return next(new AppError('Author not found', 404));
        const filter = { author: authorId, parentContent: null };
        const currentUserId = req.user ? req.user.id : null; let canViewPrivateArticles = false;
        if (currentUserId) { if (currentUserId === authorId.toString() || req.user.role === 'admin') canViewPrivateArticles = true; else if ((authorProfile.followers || []).some(followerId => followerId.toString() === currentUserId)) canViewPrivateArticles = true; }
        if (!canViewPrivateArticles) filter.isPrivateToFollowers = false;
        const articles = await Content.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'username profilePicture isVerified').select('id title createdAt isPrivateToFollowers likeCount text'); // Added text for snippet
        const totalArticles = await Content.countDocuments(filter);
        res.json({ articles, page, pages: Math.ceil(totalArticles / limit), totalArticles });
    })
];

// @desc    Toggle privacy of an article
// @route   PUT /api/content/:articleId/privacy
// @access  Private (Author of article only)
const toggleArticlePrivacy = [
    param('articleId').isMongoId().withMessage('Invalid article ID format'),
    body('isPrivateToFollowers').isBoolean().withMessage('isPrivateToFollowers must be a boolean value'),
    asyncHandler(async (req, res, next) => {
        if (!checkValidation(req, next)) return;
        const articleId = req.params.articleId; const { isPrivateToFollowers } = req.body; const currentUserId = req.user.id;
        const article = await Content.findById(articleId); if (!article) return next(new AppError('Article not found', 404));
        if (article.author.toString() !== currentUserId && req.user.role !== 'admin') return next(new AppError('Not authorized to change privacy of this article', 403));
        article.isPrivateToFollowers = isPrivateToFollowers; await article.save();
        res.json({ message: `Article privacy updated successfully. It is now ${isPrivateToFollowers ? 'Private (Followers Only)' : 'Public'}.`, articleId: article.id, isPrivateToFollowers: article.isPrivateToFollowers });
    })
];

// --- Admin Controllers ---
const getAllContentForAdmin = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1; const limit = parseInt(req.query.limit, 10) || 500; const skip = (page - 1) * limit;
  const allContent = await Content.find({}).sort({ createdAt: -1 }).populate('author', 'username').select('id title text author parentContent createdAt updatedAt likeCount isReported reports').skip(skip).limit(limit);
  const totalContent = await Content.countDocuments({});
  res.json({ content: allContent.map(c => ({ ...c.toJSON(), id: c._id.toString(), reportsCount: (c.reports || []).length })), page, pages: Math.ceil(totalContent / limit), totalContent });
});

const deleteContentForAdmin = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;
    const contentIdToDelete = req.params.id; const content = await Content.findById(contentIdToDelete); if (!content) return next(new AppError('Content not found', 404));
    const deleteChildrenRecursive = async (parentId) => { const children = await Content.find({ parentContent: parentId }).select('_id'); for (const child of children) { await deleteChildrenRecursive(child.id); await Content.deleteOne({ _id: child.id }); console.log(`Admin deleted child content: ${child.id}`); } };
    await deleteChildrenRecursive(contentIdToDelete); await Content.deleteOne({ _id: contentIdToDelete }); console.log(`Admin deleted main content: ${contentIdToDelete} and its children.`);
    res.json({ message: `Content ${contentIdToDelete} and all its replies removed successfully` });
  }),
];

export {
  unreportContent,
  getFilteredContent,
  getMyPageFeed,
  getExploreFeed,
  getContentById,
  getContentLineage,
  getContentVersions,
  createContent,
  updateContent,
  toggleLikeContent,
  reportContent,
  getArticlesByUser,
  toggleArticlePrivacy,
  getAllContentForAdmin,
  deleteContentForAdmin,
};
