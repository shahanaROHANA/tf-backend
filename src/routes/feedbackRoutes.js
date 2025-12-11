// src/routes/feedbackRoutes.js
import express from 'express';
import multer from 'multer';
import {
  createFeedback,
  getFeedback,
  getFeedbackStatistics,
  reportFeedback,
  markFeedbackHelpful,
  getUserFeedback,
  getFeedbackById
} from '../controllers/feedbackController.js';

import {
  getModerationQueue,
  getReportsQueue,
  approveFeedback,
  rejectFeedback,
  editFeedback,
  resolveReport,
  dismissReport,
  getAdminFeedbackStats,
  bulkModerateFeedback,
  getFeedbackAuditTrail
} from '../controllers/feedbackAdminController.js';

import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

// Configure multer for media uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and MP4 files are allowed.'));
    }
  }
});

const router = express.Router();

// Public routes (require authentication)
router.post('/create', authMiddleware, upload.array('media', 5), createFeedback);
router.get('/', authMiddleware, getFeedback);
router.get('/statistics', authMiddleware, getFeedbackStatistics);
router.get('/user', authMiddleware, getUserFeedback);
router.get('/:feedbackId', authMiddleware, getFeedbackById);

// User actions
router.post('/:feedbackId/report', authMiddleware, reportFeedback);
router.post('/:feedbackId/helpful', authMiddleware, markFeedbackHelpful);

// Admin routes
router.get('/admin/queue', authMiddleware, adminMiddleware, getModerationQueue);
router.get('/admin/reports', authMiddleware, adminMiddleware, getReportsQueue);
router.get('/admin/stats', authMiddleware, adminMiddleware, getAdminFeedbackStats);
router.get('/admin/audit/:feedbackId', authMiddleware, adminMiddleware, getFeedbackAuditTrail);

// Admin moderation actions
router.post('/admin/:feedbackId/approve', authMiddleware, adminMiddleware, approveFeedback);
router.post('/admin/:feedbackId/reject', authMiddleware, adminMiddleware, rejectFeedback);
router.put('/admin/:feedbackId', authMiddleware, adminMiddleware, editFeedback);
router.post('/admin/bulk', authMiddleware, adminMiddleware, bulkModerateFeedback);

// Report resolution
router.post('/admin/reports/:reportId/resolve', authMiddleware, adminMiddleware, resolveReport);
router.post('/admin/reports/:reportId/dismiss', authMiddleware, adminMiddleware, dismissReport);

export default router;