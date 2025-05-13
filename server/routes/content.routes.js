// Rewrite/server/routes/content.routes.js
import express from 'express';
import {
    getFilteredContent,
  getTopLevelArticles,
  getContentById,
  getContentLineage,
  getContentVersions,
  createContent,
  updateContent,
  toggleLikeContent,
  reportContent,
  getAllContentForAdmin,
  deleteContentForAdmin,
} from '../controllers/content.controller.js';
import { protect, admin } from '../middleware/auth.middleware.js'; // Assuming 'admin' is a role check middleware

const router = express.Router();

// --- Public Routes ---
router.get('/', getFilteredContent ); // Get all top-level articles (paginated)
router.get('/:id', getContentById); // Get specific content item by ID
router.get('/:id/lineage', getContentLineage); // Get content lineage for "Read" page
router.get('/:id/versions', getContentVersions); // Get alternative versions (siblings)

// --- Protected Routes (User Authentication Required) ---
router.post('/', protect, createContent); // Create new content (article or reply)
router.put('/:id', protect, updateContent); // Update content (author only)
router.post('/:id/like', protect, toggleLikeContent); // Like or unlike content
router.post('/:id/report', protect, reportContent); // Report content

// --- Admin Routes (Admin Role Required) ---
// Prefixing admin routes with /admin for clarity, or handle in controller/middleware
router.get('/admin/all', protect, admin, getAllContentForAdmin); // Get all content for admin view
router.delete('/admin/:id', protect, admin, deleteContentForAdmin); // Delete content (admin)

export default router;
