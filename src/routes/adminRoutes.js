import express from 'express';
import {
  // Vendor Management
  getAllVendors,
  listPendingSellers,
  approveSeller,
  rejectSeller,
  updateVendor,
  deleteVendor,
  getVendorPerformance,
  
  // Menu Oversight
  getAllMenus,
  flagMenuItem,
  toggleMenuItem,
  
  // Order Monitoring
  getAllOrders,
  forceCancelOrder,
  
  // User Management
  getAllUsers,
  toggleUserStatus,
  
  // Analytics
  getAnalytics,
  
  // Platform Settings
  getPlatformSettings,
  updatePlatformSettings
} from '../controllers/adminController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.use(isAdmin);

// ============= ADMIN DASHBOARD =============
router.get('/dashboard', getAnalytics);

// ============= VENDOR MANAGEMENT =============
router.get('/vendors', getAllVendors);
router.get('/sellers/pending', listPendingSellers);
router.post('/sellers/:sellerId/approve', approveSeller);
router.delete('/sellers/:sellerId/reject', rejectSeller);
router.put('/vendors/:sellerId', updateVendor);
router.delete('/vendors/:sellerId', deleteVendor);
router.get('/vendors/:sellerId/performance', getVendorPerformance);

// ============= MENU OVERSIGHT =============
router.get('/menus', getAllMenus);
router.post('/menus/:productId/flag', flagMenuItem);
router.put('/menus/:productId/toggle', toggleMenuItem);

// ============= ORDER MONITORING =============
router.get('/orders', getAllOrders);
router.post('/orders/:orderId/cancel', forceCancelOrder);

// ============= USER MANAGEMENT =============
router.get('/users', getAllUsers);
router.put('/users/:userId/toggle-status', toggleUserStatus);

// ============= ANALYTICS DASHBOARD =============
router.get('/analytics', getAnalytics);

// ============= PLATFORM SETTINGS =============
router.get('/settings', getPlatformSettings);
router.put('/settings', updatePlatformSettings);

export default router;
