// Rewrite/server/routes/content.routes.js
import express from 'express';
import {
  // Main content fetching (handles general, popular via query params)
  getFilteredContent,
  
   getSitemap, // <-- IMPORT NEW
  // Specific Feed Controllers
  getMyPageFeed,
  getExploreFeed,

  // Single content item and its variations/lineage
  getContentById,
  getContentLineage,
  getContentVersions,

  // User-specific content list
  getArticlesByUser,

  // Protected actions on content
  createContent,
  updateContent,
  toggleLikeContent,
  reportContent,
  toggleArticlePrivacy,
  unreportContent, 

  // Admin actions
  getAllContentForAdmin,
  deleteContentForAdmin,
} from '../controllers/content.controller.js';

// Middleware
import { protect, admin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Placed near the top for visibility.
router.get('/sitemap.xml', getSitemap);

// --- Feed Routes (Specific Endpoints) ---
// These are protected as they are personalized or involve potentially complex queries
router.get('/feed/my-page', protect, getMyPageFeed);
router.get('/feed/explore', protect, getExploreFeed);

// --- General Content Fetching Routes ---
// This route handles various scenarios based on query parameters:
// - Default: Recent public articles (if no feedType, parentContent=null)
// - Popular: ?feedType=popular&sortBy=truePopularity_desc
// - Children/Replies: ?parentContent=<parent_id>
// - Title lists: ?view=titles
router.get('/', getFilteredContent);

// --- Routes for Specific User's Articles ---
// 'protect' is used here so req.user is available in getArticlesByUser for privacy checks
router.get('/user/:userId', protect, getArticlesByUser);

// --- Routes for Individual Content Items & Their Variations ---
router.get('/:id', getContentById);
router.get('/:id/lineage', getContentLineage);
router.get('/:id/versions', getContentVersions); // Gets siblings of content item :id

// --- Protected Routes for Content Creation & Modification ---
router.post('/', protect, createContent); // Create new top-level article or reply
router.put('/:id', protect, updateContent); // Edit existing content text (author or admin)
router.put('/:articleId/privacy', protect, toggleArticlePrivacy); // Toggle public/followers-only (author or admin)
router.post('/:id/like', protect, toggleLikeContent); // Like or unlike content
router.post('/:id/report', protect, reportContent); // Report content
router.delete('/:id/report', protect, unreportContent); // <-- THIS IS THE MISSING ROUTE.
// ...
// --- Admin Only Content Routes ---
router.get('/admin/all', protect, admin, getAllContentForAdmin); // Get all content items (for admin panel)

router.delete('/admin/:id', protect, admin, deleteContentForAdmin); // Delete any content item and its children (admin)

//import { generateSitemap } from '../controllers/sitemap.controller.js'; // new

// Sitemap route (public)
//router.get('/sitemap.xml', generateSitemap);


export default router;
