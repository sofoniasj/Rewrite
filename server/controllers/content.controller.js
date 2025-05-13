// Rewrite/server/controllers/content.controller.js
import asyncHandler from 'express-async-handler';
import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Content from '../models/content.model.js';
import User from '../models/user.model.js'; // Needed for populating author
import AppError from '../utils/AppError.js';

// Helper to check for validation errors
const checkValidation = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

// --- Public Controllers ---

// @desc    Get top-level articles (or titles for "Read" page)
// @route   GET /api/content
// @route   GET /api/content?view=titles
// @route   GET /api/content?page=1&limit=10
// @access  Public
const getTopLevelArticles = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;
  const view = req.query.view; // 'titles' or undefined for full content

  const query = Content.find({ parentContent: null })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username'); // Populate author's username

  if (view === 'titles') {
    query.select('title createdAt author id'); // Select only necessary fields for titles view
  }

  const articles = await query;
  const totalArticles = await Content.countDocuments({ parentContent: null });

  res.json({
    articles,
    page,
    pages: Math.ceil(totalArticles / limit),
    totalArticles,
  });
});




// In controllers/content.controller.js, modify getTopLevelArticles (or create getFilteredContent)

const getFilteredContent = asyncHandler(async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10; // Adjust limit as needed for children
    const skip = (page - 1) * limit;
  
    // --- Filtering ---
    const filter = {};
    if (req.query.parentContent === 'null' || !req.query.parentContent) {
        filter.parentContent = null; // Top level articles
    } else if (mongoose.Types.ObjectId.isValid(req.query.parentContent)) {
        filter.parentContent = req.query.parentContent; // Children of a specific parent
    } else {
        // Ignore invalid parentContent query
    }
  
    // --- Sorting ---
    let sort = { createdAt: -1 }; // Default sort
    if (req.query.sortBy === 'likes_desc') {
        sort = { likeCount: -1, createdAt: 1 };
    } else if (req.query.sortBy === 'createdAt_asc') {
        sort = { createdAt: 1 };
    } // Add other sorting options if needed
  
    const query = Content.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('author', 'username')
      .populate('likes', 'id'); // Populate likes IDs for initial check
  
    const articles = await query;
    const totalArticles = await Content.countDocuments(filter);
  
    res.json({
      articles,
      page,
      pages: Math.ceil(totalArticles / limit),
      totalArticles,
    });
  });
  
  // Remember to update the route in content.routes.js to use this controller for GET /api/content
// @desc    Get a single content item by ID (and its direct children, if needed)
// @route   GET /api/content/:id
// @access  Public
const getContentById = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const content = await Content.findById(req.params.id)
      .populate('author', 'username')
      // .populate({ // Optionally populate direct children
      //   path: 'children',
      //   select: 'text author createdAt likeCount',
      //   populate: { path: 'author', select: 'username' }
      // });

    if (!content) {
      return next(new AppError('Content not found', 404));
    }
    res.json(content);
  }),
];


// @desc    Get content lineage for "Read" page (parent + top-liked descendants)
// @route   GET /api/content/:id/lineage
// @access  Public
const getContentLineage = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const lineage = [];
    let currentContentId = req.params.id;
    const MAX_DEPTH = 10; // Prevent infinite loops or excessively deep queries

    for (let i = 0; i < MAX_DEPTH && currentContentId; i++) {
      const contentItem = await Content.findById(currentContentId)
        .populate('author', 'username')
        .select('id title text author createdAt likeCount parentContent'); // Select necessary fields

      if (!contentItem) break; // Stop if content not found

      lineage.push(contentItem);

      // Find the top-liked child of the current contentItem
      const topChild = await Content.findOne({ parentContent: contentItem.id })
        .sort({ likeCount: -1, createdAt: 1 }) // Top liked, then oldest
        .select('id'); // Only need ID for the next iteration

      currentContentId = topChild ? topChild.id : null;
    }

    if (lineage.length === 0) {
        return next(new AppError('Content not found or lineage could not be constructed', 404));
    }

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
    if (!contentItem || !contentItem.parentContent) {
      // If it's a top-level post or doesn't exist, it has no "versions" in this context
      return res.json([]);
    }

    const versions = await Content.find({
      parentContent: contentItem.parentContent,
      _id: { $ne: req.params.id }, // Exclude the item itself
    })
      .sort({ likeCount: -1, createdAt: 1 })
      .populate('author', 'username')
      .select('id text author createdAt likeCount');

    res.json(versions);
  }),
];


// --- Protected Controllers (Require Authentication) ---

// @desc    Create new content (article or reply)
// @route   POST /api/content
// @access  Private
const createContent = [
  body('text').trim().isLength({ min: 1, max: 10000 }).withMessage('Content text must be between 1 and 10000 characters'),
  body('title').optional().trim().isLength({ max: 150 }).withMessage('Title cannot exceed 150 characters'),
  body('parentContent').optional().isMongoId().withMessage('Invalid parentContent ID format'),

  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const { title, text, parentContent } = req.body;

    const newContentData = {
      author: req.user.id,
      text,
    };

    if (title && !parentContent) { // Title is only for top-level articles
      newContentData.title = title;
    }
    if (parentContent) {
      const parent = await Content.findById(parentContent);
      if (!parent) {
        return next(new AppError('Parent content not found', 404));
      }
      newContentData.parentContent = parentContent;
    }

    const content = await Content.create(newContentData);
    
    // Populate author before sending response
    const populatedContent = await Content.findById(content.id).populate('author', 'username');

    res.status(201).json(populatedContent);
  }),
];

// @desc    Update existing content
// @route   PUT /api/content/:id
// @access  Private (author only)
const updateContent = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  body('text').trim().isLength({ min: 1, max: 10000 }).withMessage('Content text must be between 1 and 10000 characters'),
  // Allow title update only if it's a top-level post and no children exist? (More complex rule)
  // For simplicity, only text update is handled here. Title updates could be a separate endpoint or more complex logic.

  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const { text } = req.body;
    const content = await Content.findById(req.params.id);

    if (!content) {
      return next(new AppError('Content not found', 404));
    }

    // Check if the logged-in user is the author
    if (content.author.toString() !== req.user.id.toString()) {
      return next(new AppError('User not authorized to update this content', 403));
    }

    content.text = text;
    // content.updatedAt will be set automatically by timestamps:true
    const updatedContent = await content.save();
    const populatedContent = await Content.findById(updatedContent.id).populate('author', 'username');


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

    const content = await Content.findById(req.params.id);
    if (!content) {
      return next(new AppError('Content not found', 404));
    }

    const userId = req.user.id;
    const alreadyLikedIndex = content.likes.findIndex(like => like.toString() === userId.toString());

    if (alreadyLikedIndex > -1) {
      // User already liked, so unlike
      content.likes.splice(alreadyLikedIndex, 1);
    } else {
      // User has not liked, so like
      content.likes.push(userId);
    }
    // likeCount will be updated by pre-save hook
    await content.save();
    
    // Populate author and likes with usernames for a richer response if needed
    const populatedContent = await Content.findById(content.id)
        .populate('author', 'username')
        .populate('likes', 'username'); // Example: populate who liked it

    res.json({
        id: populatedContent.id,
        likes: populatedContent.likes, // Or just the IDs: content.likes
        likeCount: populatedContent.likeCount,
        // message: alreadyLikedIndex > -1 ? 'Content unliked' : 'Content liked'
    });
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
    
    const { reason } = req.body;
    const content = await Content.findById(req.params.id);
    if (!content) {
      return next(new AppError('Content not found', 404));
    }

    const userId = req.user.id;
    // Check if user has already reported this content
    const alreadyReported = content.reports.find(report => report.reporter.toString() === userId.toString());

    if (alreadyReported) {
      return next(new AppError('You have already reported this content', 400));
    }

    content.reports.push({ reporter: userId, reason: reason });
    // isReported will be updated by pre-save hook
    await content.save();

    res.json({ message: 'Content reported successfully', contentId: content.id, isReported: content.isReported });
  }),
];


// --- Admin Controllers (Require Admin Role) ---

// @desc    Get all content for admin (e.g., for family tree view)
// @route   GET /api/content/admin/all
// @access  Private/Admin
const getAllContentForAdmin = asyncHandler(async (req, res, next) => {
  // Add pagination for admin view if dataset can be very large
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 500; // Larger limit for admin, or no limit
  const skip = (page - 1) * limit;

  const allContent = await Content.find({})
    .sort({ createdAt: -1 }) // Or by another field relevant for admin
    .populate('author', 'username')
    .select('id title text author parentContent createdAt likeCount isReported reports') // Select fields needed for tree
    .skip(skip)
    .limit(limit);

  const totalContent = await Content.countDocuments({});
  
  res.json({
    content: allContent,
    page,
    pages: Math.ceil(totalContent / limit),
    totalContent
  });
});

// @desc    Delete content (by Admin)
// @route   DELETE /api/content/admin/:id
// @access  Private/Admin
const deleteContentForAdmin = [
  param('id').isMongoId().withMessage('Invalid content ID format'),
  asyncHandler(async (req, res, next) => {
    if (!checkValidation(req, next)) return;

    const content = await Content.findById(req.params.id);
    if (!content) {
      return next(new AppError('Content not found', 404));
    }

    // ... inside deleteContentForAdmin, before Content.deleteOne({ _id: req.params.id });
const deleteChildrenRecursive = async (parentId) => {
  const children = await Content.find({ parentContent: parentId }).select('_id');
  for (const child of children) {
      await deleteChildrenRecursive(child.id); // Recursively delete grandchildren
      await Content.deleteOne({ _id: child.id });
  }
};
await deleteChildrenRecursive(req.params.id); // Start recursion
await Content.deleteOne({ _id: req.params.id }); // Delete the main node
    // Potentially complex: what to do with children of deleted content?
    // Option 1: Delete all children (cascading delete - can be resource-intensive and needs careful implementation)
    // Option 2: Set children's parentContent to null (orphans them)
    // Option 3: Mark content as 'deleted_by_admin' instead of actual deletion (soft delete)

    // Simple deletion for now:
    

    // If implementing cascading delete for children:
    // await Content.deleteMany({ parentContent: req.params.id }); // This is a basic example, recursion might be needed for deeper trees

    res.json({ message: 'Content removed successfully' });
  }),
];


export {

  getTopLevelArticles,
  getFilteredContent,
  getContentById,
  getContentLineage,
  getContentVersions,
  createContent,
  updateContent,
  toggleLikeContent,
  reportContent,
  getAllContentForAdmin,
  deleteContentForAdmin,
};

