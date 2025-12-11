
import express from 'express';
import { 
  getSellerOrders, 
  updateItemStatus,
  getSellerProfile,
  updateSellerProfile,
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerAnalytics,
  getSellerRatings,
  getSellerTrainAssignments
} from '../controllers/sellerDashboardController.js';
import { protectSeller } from '../middleware/sellerAuthMiddleware.js';

const router = express.Router();
router.use(protectSeller);

// Dashboard Overview
router.get('/stats', getSellerAnalytics);

// Profile Management
router.get('/profile', getSellerProfile);
router.put('/profile', updateSellerProfile);

// Order Management
router.get('/orders', getSellerOrders);
router.post('/item/update', updateItemStatus);

// Menu/Product Management
router.get('/products', getSellerProducts);
router.post('/products', createSellerProduct);
router.put('/products/:id', updateSellerProduct);
router.delete('/products/:id', deleteSellerProduct);

// Analytics & Revenue
router.get('/analytics', getSellerAnalytics);

// Ratings & Feedback
router.get('/ratings', getSellerRatings);

// Train Assignments
router.get('/trains', getSellerTrainAssignments);

export default router;
