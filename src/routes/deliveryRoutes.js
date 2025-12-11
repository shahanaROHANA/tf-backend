import express from "express";
import {
  registerDelivery,
  loginDelivery,
  assignOrder,
  updateDeliveryStatus,
  getMyDeliveries,
  getDeliveryProfile,
  getDeliveryDashboard,
  updateAvailability,
  getAvailableOrders,
  acceptOrder,
  declineOrder,
  getEarnings,
  updateLocation,
  reportIssue,
  generateDeliveryOTP,
  verifyDeliveryOTP
} from "../controllers/deliveryController.js";
import { protectDelivery } from "../middleware/deliveryAuthMiddleware.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin: create & assign delivery
router.post("/register", protect, isAdmin, registerDelivery);
router.post("/assign", protect, isAdmin, assignOrder);

// Delivery person auth
router.post("/login", loginDelivery);

// Delivery person dashboard
router.get("/dashboard", protectDelivery, getDeliveryDashboard);
router.get("/profile", protectDelivery, getDeliveryProfile);
router.put("/availability", protectDelivery, updateAvailability);
router.get("/available-orders", protectDelivery, getAvailableOrders);
router.get("/orders/available", protectDelivery, getAvailableOrders);
router.get("/orders/my", protectDelivery, getMyDeliveries);
router.post("/orders/accept", protectDelivery, acceptOrder);
router.post("/orders/decline", protectDelivery, declineOrder);
router.put("/orders/status", protectDelivery, updateDeliveryStatus);
router.get("/earnings", protectDelivery, getEarnings);
router.put("/location", protectDelivery, updateLocation);
router.post("/report-issue", protectDelivery, reportIssue);

// OTP verification
router.post("/otp/:orderId/generate", protectDelivery, generateDeliveryOTP);
router.post("/otp/verify", protectDelivery, verifyDeliveryOTP);

export default router;
