// routes/orderRoutes.js
import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// Create order — must be authenticated (complete checkout process)
router.post('/', protect, orderController.createOrder);

// Get current user's orders (for the logged-in user)
router.get('/my', protect, orderController.getUserOrders);

// Get specific order details
router.get('/:id', protect, orderController.getOrderById);

// Cancel order
router.post('/:id/cancel', protect, orderController.cancelOrder);

// Rate order (after delivery)
router.post('/:id/rate', protect, orderController.rateOrder);

// Update order status (for sellers, drivers, admin)
router.patch('/:id/status', protect, orderController.updateOrderStatus);

// New tracking APIs
router.get('/:id/tracking', protect, orderController.getOrderTracking);
router.put('/:id/status-tracking', protect, orderController.updateOrderStatusTracking);
router.post('/notifications', protect, orderController.subscribeNotification);

// Train schedule API
router.get('/trains/:trainNo/:date', protect, orderController.getTrainSchedule);

// Admin: list all orders
router.get('/admin/all', protect, isAdmin, adminMiddleware, orderController.getAllOrders);

// Admin: get order statistics
router.get('/admin/stats', protect, isAdmin, adminMiddleware, orderController.getOrderStats);

// Admin only: Assign order to delivery agent
router.put('/:id/assign', protect, isAdmin, orderController.assignOrder);

// Payment webhook (no auth required - handled by Stripe signature verification)
router.post('/webhook/payment', express.raw({ type: 'application/json' }), orderController.paymentWebhook);

export default router;
