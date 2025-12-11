import asyncHandler from "express-async-handler";
import Delivery from "../models/deliveryModel.js";
import Order from "../models/orderModel.js";
import generateToken from "../utils/generateToken.js";
import crypto from "crypto";
import queueService from "../services/queueService.js";

// Station configuration for static ETA calculation
const STATIONS = {
  'colombo': { name: 'Colombo Fort', baseTime: 0 },
  'maradana': { name: 'Maradana', baseTime: 10 },
  'dematagoda': { name: 'Dematagoda', baseTime: 15 },
  'kelaniya': { name: 'Kelaniya', baseTime: 25 },
  'ragama': { name: 'Ragama', baseTime: 40 }
};

/**
 * @desc Register new delivery person (Admin only)
 */
export const registerDelivery = asyncHandler(async (req, res) => {
  const { name, email, phone, password, vehicleInfo } = req.body;

  const exists = await Delivery.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error("Delivery person already exists");
  }

  const delivery = await Delivery.create({ 
    name, 
    email, 
    phone, 
    password,
    vehicleInfo: vehicleInfo || { type: 'bike' }
  });
  
  res.status(201).json({
    _id: delivery._id,
    name: delivery.name,
    email: delivery.email,
    token: generateToken(delivery._id, "delivery"),
  });
});

/**
 * @desc Login delivery person
 */
export const loginDelivery = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const delivery = await Delivery.findOne({ email });

  if (delivery && (await delivery.matchPassword(password))) {
    res.json({
      _id: delivery._id,
      name: delivery.name,
      email: delivery.email,
      isAvailable: delivery.isAvailable,
      earnings: delivery.earnings,
      token: generateToken(delivery._id, "delivery"),
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

/**
 * @desc Get delivery person profile
 */
export const getDeliveryProfile = asyncHandler(async (req, res) => {
  const delivery = await Delivery.findById(req.delivery._id)
    .select('-password')
    .populate('assignedOrders', 'orderNumber status totals finalCents timestamps');

  if (!delivery) {
    res.status(404);
    throw new Error("Delivery person not found");
  }

  res.json(delivery);
});

/**
 * @desc Get delivery dashboard summary
 */
export const getDeliveryDashboard = asyncHandler(async (req, res) => {
  const deliveryId = req.delivery._id;

  const delivery = await Delivery.findById(deliveryId).select('name earnings stats isAvailable activeOrderId');

  if (!delivery) {
    res.status(404);
    throw new Error("Delivery person not found");
  }

  // Get active order if any
  let activeOrder = null;
  if (delivery.activeOrderId) {
    activeOrder = await Order.findById(delivery.activeOrderId)
      .populate('user', 'name phone')
      .select('orderNumber status deliveryInfo totals timestamps');
  }

  // Get today's deliveries count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDeliveries = await Order.countDocuments({
    assignedDriver: deliveryId,
    status: 'DELIVERED',
    'timestamps.deliveredAt': { $gte: today }
  });

  // Get available orders count
  const availableOrdersCount = await Order.countDocuments({
    status: 'READY_FOR_PICKUP',
    assignedDriver: { $exists: false }
  });

  res.json({
    delivery: {
      name: delivery.name,
      isAvailable: delivery.isAvailable,
      earnings: delivery.earnings,
      stats: delivery.stats
    },
    activeOrder,
    todayDeliveries,
    availableOrdersCount
  });
});

/**
 * @desc Update delivery availability
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { available } = req.body;
  
  const delivery = await Delivery.findById(req.delivery._id);
  if (!delivery) {
    res.status(404);
    throw new Error("Delivery person not found");
  }

  delivery.isAvailable = available;
  await delivery.save();

  res.json({ 
    message: `Availability updated to ${available ? 'ONLINE' : 'OFFLINE'}`,
    isAvailable: delivery.isAvailable
  });
});

/**
 * @desc Get available orders for delivery
 */
export const getAvailableOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ 
    status: 'READY_FOR_PICKUP',
    assignedDriver: { $exists: false }
  })
  .populate('user', 'name')
  .populate('items.seller', 'name')
  .sort({ createdAt: 1 });

  res.json(orders);
});

/**
 * @desc Accept a delivery order
 */
export const acceptOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const deliveryId = req.delivery._id;

  const order = await Order.findById(orderId);
  const delivery = await Delivery.findById(deliveryId);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.assignedDriver && order.assignedDriver.toString() !== deliveryId.toString()) {
    res.status(400);
    throw new Error("Order already assigned to another driver");
  }

  // Update order
  order.assignedDriver = deliveryId;
  order.status = 'OUT_FOR_DELIVERY';
  order.timestamps.outForDeliveryAt = new Date();

  // Update delivery person
  delivery.activeOrderId = orderId;
  delivery.assignedOrders.push(orderId);
  delivery.isAvailable = false; // Make unavailable when on active delivery

  await order.save();
  await delivery.save();

  // Emit order accepted event
  await queueService.emitOrderEvent('order.accepted', orderId);

  res.json({
    message: "Order accepted successfully",
    order,
    estimatedDeliveryTime: calculateETA(order.deliveryInfo?.stationName)
  });
});

/**
 * @desc Decline a delivery order
 */
export const declineOrder = asyncHandler(async (req, res) => {
  const { orderId, reason } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Add to history that this driver declined
  order.history.push({
    status: 'DECLINED',
    at: new Date(),
    by: req.delivery._id,
    note: reason || 'Order declined by driver'
  });

  await order.save();

  res.json({ message: "Order declined" });
});

/**
 * @desc Update delivery status with station-based tracking
 */
export const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const { orderId, status, proof, station } = req.body;
  const deliveryId = req.delivery._id;

  const order = await Order.findById(orderId);
  const delivery = await Delivery.findById(deliveryId);

  if (!order || order.assignedDriver.toString() !== deliveryId.toString()) {
    res.status(404);
    throw new Error("Order not found or not assigned to you");
  }

  // Validate status progression
  const validStatuses = ['PICKED_UP', 'REACHED_STATION', 'DELIVERED'];
  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  // Update order status
  order.status = status;
  
  // Add timestamp and proof
  switch (status) {
    case 'PICKED_UP':
      order.timestamps.pickedUpAt = new Date();
      break;
    case 'REACHED_STATION':
      order.timestamps.reachedStationAt = new Date();
      order.deliveryInfo.actualStation = station;
      break;
    case 'DELIVERED':
      order.timestamps.deliveredAt = new Date();
      order.deliveryProof = proof; // OTP verification, photo, or signature
      break;
  }

  // Add to history
  order.history.push({
    status,
    at: new Date(),
    by: deliveryId,
    note: proof ? `Proof provided: ${proof.type}` : undefined
  });

  // Update delivery person stats
  if (status === 'DELIVERED') {
    delivery.stats.totalDeliveries += 1;
    delivery.stats.successfulDeliveries += 1;
    delivery.stats.completionRate = (delivery.stats.successfulDeliveries / delivery.stats.totalDeliveries) * 100;
    
    // Calculate earnings (example: ₹30 per delivery)
    const deliveryFee = 3000; // ₹30 in cents
    delivery.earnings.today += deliveryFee;
    delivery.earnings.total += deliveryFee;
    
    // Clear active order
    delivery.activeOrderId = null;
    delivery.isAvailable = true; // Make available again
  }

  await order.save();
  await delivery.save();

  // Emit events based on status
  if (status === 'PICKED_UP') {
    await queueService.emitOrderEvent('order.picked_up', orderId);
  } else if (status === 'DELIVERED') {
    await queueService.emitOrderEvent('order.delivered', orderId);
  }

  res.json({
    message: `Order status updated to ${status}`,
    order: {
      _id: order._id,
      status: order.status,
      timestamps: order.timestamps
    }
  });
});

/**
 * @desc Get delivery person assigned orders
 */
export const getMyDeliveries = asyncHandler(async (req, res) => {
  const deliveryId = req.delivery._id;
  const { status, period } = req.query;
  
  let query = { assignedDriver: deliveryId };
  
  if (status) {
    query.status = status;
  }
  
  // Filter by period
  if (period === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query.createdAt = { $gte: today };
  }

  const orders = await Order.find(query)
    .populate('user', 'name phone')
    .populate('items.seller', 'name')
    .sort({ createdAt: -1 });

  res.json(orders);
});

/**
 * @desc Get earnings information
 */
export const getEarnings = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const deliveryId = req.delivery._id;

  const delivery = await Delivery.findById(deliveryId).select('earnings stats');
  
  if (!delivery) {
    res.status(404);
    throw new Error("Delivery person not found");
  }

  let earnings = delivery.earnings;

  // If today's earnings requested, calculate from orders
  if (period === 'today') {
    const todayOrders = await Order.find({
      assignedDriver: deliveryId,
      status: 'DELIVERED',
      timestamps: {
        deliveredAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const todayEarnings = todayOrders.length * 3000; // ₹30 per delivery
    earnings = {
      ...delivery.earnings,
      today: todayEarnings
    };
  }

  res.json({
    earnings,
    stats: delivery.stats,
    deliveryCount: delivery.stats.totalDeliveries
  });
});

/**
 * @desc Update location (simplified for station-based system)
 */
export const updateLocation = asyncHandler(async (req, res) => {
  const { station } = req.body; // Station name instead of coordinates
  const deliveryId = req.delivery._id;

  const delivery = await Delivery.findById(deliveryId);
  if (!delivery) {
    res.status(404);
    throw new Error("Delivery person not found");
  }

  // Store current station
  delivery.currentStation = station;
  await delivery.save();

  res.json({ 
    message: "Location updated", 
    currentStation: station 
  });
});

/**
 * @desc Report issue with delivery
 */
export const reportIssue = asyncHandler(async (req, res) => {
  const { orderId, issueType, description } = req.body;
  const deliveryId = req.delivery._id;

  const order = await Order.findById(orderId);
  if (!order || order.assignedDriver.toString() !== deliveryId.toString()) {
    res.status(404);
    throw new Error("Order not found or not assigned to you");
  }

  // Add issue to order history
  order.history.push({
    status: 'ISSUE_REPORTED',
    at: new Date(),
    by: deliveryId,
    note: `${issueType}: ${description}`
  });

  await order.save();

  res.json({ message: "Issue reported successfully" });
});

/**
 * @desc Generate OTP for delivery verification
 */
export const generateDeliveryOTP = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

  // Store OTP (in production, this would be sent to customer)
  order.deliveryOTP = hashedOTP;
  order.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  
  await order.save();

  res.json({ 
    message: "OTP generated", 
    otp, // In production, send via SMS/WhatsApp
    expiresIn: 600 // 10 minutes
  });
});

/**
 * @desc Verify OTP for delivery completion
 */
export const assignOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const deliveryId = req.delivery._id;

  const order = await Order.findById(orderId);
  const delivery = await Delivery.findById(deliveryId);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.assignedDriver) {
    res.status(400);
    throw new Error("Order already assigned");
  }

  // Assign to nearest available driver (simplified - just assign to requesting driver)
  order.assignedDriver = deliveryId;
  order.status = 'ASSIGNED';
  
  await order.save();

  res.json({ 
    message: "Order assigned successfully", 
    order,
    estimatedDeliveryTime: calculateETA(order.deliveryInfo?.stationName)
  });
});

export const verifyDeliveryOTP = asyncHandler(async (req, res) => {
  const { orderId, otp } = req.body;
  
  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (!order.deliveryOTP || !order.otpExpiresAt || order.otpExpiresAt < new Date()) {
    res.status(400);
    throw new Error("OTP expired or not generated");
  }

  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  if (hashedOTP !== order.deliveryOTP) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  // Clear OTP
  order.deliveryOTP = undefined;
  order.otpExpiresAt = undefined;
  await order.save();

  res.json({ message: "OTP verified successfully" });
});

// Helper function to calculate ETA based on station
function calculateETA(stationName) {
  if (!stationName) return null;
  
  const stationKey = stationName.toLowerCase();
  const station = STATIONS[stationKey];
  
  if (!station) return null;
  
  const eta = new Date(Date.now() + station.baseTime * 60 * 1000);
  return eta;
}
