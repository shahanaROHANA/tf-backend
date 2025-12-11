import Stripe from 'stripe';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Seller from '../models/Seller.js';
import Delivery from '../models/deliveryModel.js';
import TrainSchedule from '../models/trainScheduleModel.js';
import crypto from 'crypto';
import queueService from '../services/queueService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const CURRENCY = process.env.CURRENCY || 'usd';

// Helper function to compute expected ready time
const computeExpectedReadyAt = async (trainNo, stationName, prepTimeMinutes = 20) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const schedule = await TrainSchedule.findOne({ trainNo, date: today });

    if (!schedule) {
      console.warn(`No schedule found for train ${trainNo} on ${today}`);
      return null;
    }

    const stationStop = schedule.stops.find(stop => stop.station === stationName);
    if (!stationStop) {
      console.warn(`Station ${stationName} not found in schedule for train ${trainNo}`);
      return null;
    }

    // Calculate expected ready time: scheduledArrival - (prepTime + buffers)
    const scheduledArrival = new Date(stationStop.arrival);
    const prepTimeMs = prepTimeMinutes * 60 * 1000; // prep time in ms
    const transitBuffer = 5 * 60 * 1000; // 5 minutes for transit
    const pickupBuffer = 3 * 60 * 1000; // 3 minutes for handover

    const expectedReadyAt = new Date(scheduledArrival.getTime() - prepTimeMs - transitBuffer - pickupBuffer);

    return {
      scheduledArrival,
      scheduledDepart: new Date(stationStop.departure),
      expectedReadyAt,
      stationIndex: schedule.stops.findIndex(stop => stop.station === stationName)
    };
  } catch (error) {
    console.error('Error computing expected ready time:', error);
    return null;
  }
};

// Create new order with complete checkout process
export const createOrder = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userId = req.user.id;
    const { 
      items, 
      deliveryInfo, 
      paymentMethod, 
      couponCode,
      specialInstructions,
      idempotencyKey 
    } = req.body;

    // Validate idempotency key to prevent duplicate orders
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey });
      if (existingOrder) {
        return res.status(200).json({ 
          message: 'Order already processed',
          orderId: existingOrder._id,
          orderNumber: existingOrder.orderNumber
        });
      }
    }

    // Input validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and cannot be empty' });
    }

    if (!deliveryInfo || !deliveryInfo.type) {
      return res.status(400).json({ message: 'Delivery information is required' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    // Validate delivery info based on type
    if (deliveryInfo.type === 'train') {
      if (!deliveryInfo.trainNo || !deliveryInfo.coach || !deliveryInfo.seat) {
        return res.status(400).json({ message: 'Train number, coach, and seat are required for train delivery' });
      }
    } else if (deliveryInfo.type === 'station') {
      if (!deliveryInfo.stationName) {
        return res.status(400).json({ message: 'Station name is required for station pickup' });
      }
    } else if (deliveryInfo.type === 'home') {
      if (!deliveryInfo.address) {
        return res.status(400).json({ message: 'Address is required for home delivery' });
      }
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || typeof item.productId !== 'string') {
        return res.status(400).json({ message: 'Valid productId is required for each item' });
      }
      if (!item.qty || item.qty < 1 || item.qty > 99) {
        return res.status(400).json({ message: 'Quantity must be between 1 and 99 for each item' });
      }
    }

    // Get products and validate stock
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const prodMap = {};
    products.forEach(p => { prodMap[p._id.toString()] = p; });

    // Check if all products exist and have stock
    for (const item of items) {
      const product = prodMap[item.productId];
      if (!product) {
        return res.status(400).json({ message: `Product ${item.productId} not found` });
      }
      
      // Handle stock validation - null means unlimited stock
      if (product.stock !== null && product.stock !== undefined && product.stock < item.qty) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.qty}` });
      }
    }

    // Calculate totals
    let subtotalCents = 0;
    const orderItems = items.map(i => {
      const product = prodMap[i.productId];
      const itemOptions = i.options || [];
      let itemPriceCents = product.priceCents;
      
      // Add option prices
      itemOptions.forEach(option => {
        if (option.priceCents) {
          itemPriceCents += option.priceCents;
        }
      });

      const itemTotal = itemPriceCents * i.qty;
      subtotalCents += itemTotal;

      return {
        product: product._id,
        name: product.name,
        qty: i.qty,
        priceCents: itemPriceCents,
        seller: product.restaurant,
        itemNote: i.itemNote || '',
        options: itemOptions
      };
    });

    // Calculate delivery fee based on type
    let deliveryCents = 2000; // Default ₹20
    if (deliveryInfo.type === 'train') {
      deliveryCents = 3000; // ₹30 for train delivery
    } else if (deliveryInfo.type === 'home') {
      deliveryCents = 4000; // ₹40 for home delivery
    }

    // Apply coupon discount (simplified)
    let discountCents = 0;
    if (couponCode) {
      // Here you would validate the coupon against a coupons collection
      if (couponCode === 'FIRST10') {
        discountCents = Math.min(subtotalCents * 0.1, 1000); // 10% off, max ₹10
      }
    }

    // Calculate tax (simplified 5% GST)
    const taxCents = Math.round((subtotalCents - discountCents) * 0.05);
    const finalCents = subtotalCents - discountCents + taxCents + deliveryCents;

    // Compute schedule fields for train deliveries
    let scheduleData = {};
    if (deliveryInfo.type === 'train' && deliveryInfo.trainNo && deliveryInfo.stationName) {
      const computed = await computeExpectedReadyAt(deliveryInfo.trainNo, deliveryInfo.stationName);
      if (computed) {
        scheduleData = {
          trainNo: deliveryInfo.trainNo,
          station: deliveryInfo.stationName,
          stationIndex: computed.stationIndex,
          scheduledArrival: computed.scheduledArrival,
          scheduledDepart: computed.scheduledDepart,
          expectedReadyAt: computed.expectedReadyAt,
          statusHistory: [{ status: 'Pending', time: new Date() }]
        };
      }
    }

    // Create payment data based on method
    let paymentData = {
      method: paymentMethod,
      status: 'PENDING'
    };

    // Handle payment based on method
    if (paymentMethod === 'COD') {
      // For COD, payment is pending until delivery
      paymentData.status = 'PENDING';
    } else if (['UPI', 'CARD', 'WALLET'].includes(paymentMethod)) {
      // For online payments, create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: finalCents,
        currency: CURRENCY.toLowerCase(),
        metadata: {
          integration_check: 'trainfood',
          userId: userId.toString(),
          orderType: 'train_food'
        },
        payment_method_types: paymentMethod === 'UPI' ? ['upi'] : ['card']
      });

      paymentData.gatewayId = paymentIntent.id;
    } else {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Create order
    const order = await Order.create({
      user: userId,
      items: orderItems,
      deliveryInfo,
      totals: {
        subtotalCents,
        taxCents,
        deliveryCents,
        discountCents,
        couponCode,
        finalCents
      },
      payment: paymentData,
      specialInstructions,
      idempotencyKey,
      status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
      ...scheduleData
    });

    // Decrement stock for non-null stock values
    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.qty }
      });
    }

    // Emit order created event for notifications
    await queueService.emitOrderEvent('order.created', order._id);

    const response = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalCents: finalCents,
      message: 'Order created successfully'
    };

    // Only return clientSecret for online payments
    if (['UPI', 'CARD', 'WALLET'].includes(paymentMethod) && paymentData.gatewayId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentData.gatewayId);
      response.clientSecret = paymentIntent.client_secret;
    }

    res.status(201).json(response);

  } catch (err) {
    console.error('createOrder error', err);
    res.status(400).json({ message: err.message || 'Order creation failed' });
  }
};

// Get order details by ID
export const getOrderById = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const order = await Order.findById(orderId)
      .populate('user', 'name email phone')
      .populate('items.product', 'name description images')
      .populate('items.seller', 'name phone email')
      .populate('assignedDriver', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin/driver
    if (order.user._id.toString() !== userId && req.user.role !== 'admin' && req.user.role !== 'deliveryAgent') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);

  } catch (err) {
    console.error('getOrderById error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get orders of the logged-in user
export const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.id;

    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate('items.product', 'name images')
      .populate('items.seller', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (err) {
    console.error('getUserOrders error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all orders (admin only)
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, trainNo } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (trainNo) filter['deliveryInfo.trainNo'] = trainNo;

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .populate('items.product', 'name')
      .populate('items.seller', 'name')
      .populate('assignedDriver', 'name phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (err) {
    console.error('getAllOrders error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, note, driverLocation } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Validate status transition
    const validTransitions = {
      'PENDING': ['CONFIRMED', 'CANCELLED', 'FAILED_PAYMENT'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY_FOR_PICKUP', 'CANCELLED'],
      'READY_FOR_PICKUP': ['OUT_FOR_DELIVERY', 'CANCELLED'],
      'OUT_FOR_DELIVERY': ['DELIVERED'],
      'DELIVERED': ['RETURNED'],
      'CANCELLED': [],
      'REJECTED': [],
      'RETURNED': [],
      'FAILED_PAYMENT': ['CONFIRMED', 'CANCELLED']
    };

    if (!validTransitions[order.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from ${order.status} to ${status}` 
      });
    }

    // Update order
    order.status = status;
    order.updatedBy = userId;

    if (driverLocation && status === 'OUT_FOR_DELIVERY') {
      order.driverLocation = {
        type: 'Point',
        coordinates: [driverLocation.longitude, driverLocation.latitude]
      };
    }

    if (note) {
      order.history.push({
        status,
        at: new Date(),
        by: userId,
        note
      });
    }

    await order.save();

    // Emit order event based on status
    const eventMap = {
      'OUT_FOR_DELIVERY': 'order.picked_up',
      'DELIVERED': 'order.delivered',
      'CANCELLED': 'order.cancelled'
    };

    if (eventMap[status]) {
      await queueService.emitOrderEvent(eventMap[status], orderId);
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });

  } catch (err) {
    console.error('updateOrderStatus error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign order to delivery agent
export const assignOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { agentId } = req.body;

    if (!agentId) return res.status(400).json({ message: "agentId is required" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== 'READY_FOR_PICKUP') {
      return res.status(400).json({ message: "Order must be ready for pickup to assign driver" });
    }

    const agent = await Delivery.findById(agentId);
    if (!agent) {
      return res.status(400).json({ message: "Invalid delivery agent" });
    }

    order.assignedDriver = agentId;
    order.status = 'OUT_FOR_DELIVERY';
    order.estimatedDeliveryTime = new Date(Date.now() + 45 * 60 * 1000); // 45 mins from now
    await order.save();

    // Emit order assigned event
    await queueService.emitOrderEvent('order.assigned', orderId);

    res.json({
      message: "Order assigned successfully",
      order
    });

  } catch (err) {
    console.error('assignOrder error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    if (['OUT_FOR_DELIVERY'].includes(order.status)) {
      return res.status(400).json({ message: 'Order is already out for delivery and cannot be cancelled' });
    }

    // Update order status
    order.status = 'CANCELLED';
    order.cancellationReason = reason || 'User requested cancellation';
    order.updatedBy = userId;

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.qty }
      });
    }

    // Process refund if payment was made
    if (order.payment.status === 'COMPLETED' && order.payment.gatewayId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.payment.gatewayId,
          reason: 'requested_by_customer'
        });

        order.payment.status = 'REFUNDED';
        order.payment.refundAmountCents = order.totals.finalCents;
        order.payment.refundReason = reason;
      } catch (refundError) {
        console.error('Refund failed:', refundError);
        // Mark refund as failed but still cancel order
        order.payment.status = 'REFUND_FAILED';
      }
    }

    await order.save();

    res.json({
      message: 'Order cancelled successfully',
      order
    });

  } catch (err) {
    console.error('cancelOrder error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Payment webhook handler
export const paymentWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(500).json({ message: 'Webhook secret not configured' });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handleFailedPayment(failedPayment);
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object;
        await handleCanceledPayment(canceledPayment);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });

  } catch (err) {
    console.error('paymentWebhook error', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Handle successful payment
const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    const order = await Order.findOne({ 'payment.gatewayId': paymentIntent.id });
    
    if (!order) {
      console.error('Order not found for payment intent:', paymentIntent.id);
      return;
    }

    if (order.payment.status === 'COMPLETED') {
      console.log('Payment already processed for order:', order._id);
      return;
    }

    // Update payment status
    order.payment.status = 'COMPLETED';
    order.payment.paidAt = new Date();
    order.status = 'CONFIRMED';
    order.confirmedAt = new Date();

    await order.save();

    // Notify sellers and user (simplified)
    console.log(`Payment successful for order ${order.orderNumber}`);

  } catch (err) {
    console.error('handleSuccessfulPayment error:', err);
  }
};

// Handle failed payment
const handleFailedPayment = async (paymentIntent) => {
  try {
    const order = await Order.findOne({ 'payment.gatewayId': paymentIntent.id });
    
    if (!order) {
      console.error('Order not found for payment intent:', paymentIntent.id);
      return;
    }

    order.payment.status = 'FAILED';
    order.status = 'FAILED_PAYMENT';

    await order.save();

    console.log(`Payment failed for order ${order.orderNumber}`);

  } catch (err) {
    console.error('handleFailedPayment error:', err);
  }
};

// Handle canceled payment
const handleCanceledPayment = async (paymentIntent) => {
  try {
    const order = await Order.findOne({ 'payment.gatewayId': paymentIntent.id });
    
    if (!order) {
      console.error('Order not found for payment intent:', paymentIntent.id);
      return;
    }

    order.payment.status = 'FAILED';
    order.status = 'CANCELLED';
    order.cancellationReason = 'Payment canceled';

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.qty }
      });
    }

    await order.save();

    console.log(`Payment canceled for order ${order.orderNumber}`);

  } catch (err) {
    console.error('handleCanceledPayment error:', err);
  }
};

// Rate order
export const rateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { rating, review } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to rate this order' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ message: 'Order must be delivered to rate' });
    }

    order.rating = rating;
    order.review = review;
    await order.save();

    // Update seller rating (simplified)
    // Here you would update the seller's average rating

    res.json({
      message: 'Order rated successfully',
      order
    });

  } catch (err) {
    console.error('rateOrder error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order tracking information
export const getOrderTracking = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.id;

    const order = await Order.findById(orderId)
      .populate('user', 'name email phone')
      .populate('items.product', 'name description images')
      .populate('items.seller', 'name phone email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns this order or is admin/seller
    if (order.user._id.toString() !== userId && req.user.role !== 'admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    // Get train schedule
    let schedule = [];
    if (order.trainNo && order.station) {
      const today = new Date().toISOString().split('T')[0];
      const trainSchedule = await TrainSchedule.findOne({ trainNo: order.trainNo, date: today });
      if (trainSchedule) {
        schedule = trainSchedule.stops.map((stop, index) => ({
          station: stop.station,
          arrival: stop.arrival,
          status: index < order.stationIndex ? 'passed' :
                  index === order.stationIndex ? 'upcoming' : 'upcoming'
        }));
      }
    }

    const response = {
      orderId: order._id,
      trainNo: order.trainNo,
      station: order.station,
      stationIndex: order.stationIndex,
      schedule,
      order: {
        status: order.status,
        prepTimeMinutes: order.prepTimeMinutes,
        expectedReadyAt: order.expectedReadyAt,
        statusHistory: order.statusHistory || []
      },
      estimatedPickup: order.expectedReadyAt
    };

    res.json(response);

  } catch (err) {
    console.error('getOrderTracking error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get train schedule
export const getTrainSchedule = async (req, res) => {
  try {
    const { trainNo, date } = req.params;

    const schedule = await TrainSchedule.findOne({ trainNo, date });
    if (!schedule) {
      return res.status(404).json({ message: 'Train schedule not found' });
    }

    // Return next 5 stops from current time
    const now = new Date();
    const upcomingStops = schedule.stops
      .filter(stop => new Date(stop.arrival) >= now)
      .slice(0, 5);

    res.json({
      trainNo: schedule.trainNo,
      date: schedule.date,
      stops: upcomingStops
    });

  } catch (err) {
    console.error('getTrainSchedule error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order status with tracking
export const updateOrderStatusTracking = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions (seller can update their items, admin can update any)
    if (req.user.role !== 'admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Not authorized to update order status' });
    }

    // Map status to internal enum if needed
    const statusMap = {
      'Pending': 'PENDING',
      'Preparing': 'PREPARING',
      'Ready': 'READY_FOR_PICKUP',
      'PickedUp': 'OUT_FOR_DELIVERY',
      'Delivered': 'DELIVERED'
    };

    const internalStatus = statusMap[status] || status;

    order.status = internalStatus;
    order.statusHistory.push({ status, time: new Date() });
    order.updatedBy = userId;

    await order.save();

    res.json({
      message: 'Order status updated successfully',
      order
    });

  } catch (err) {
    console.error('updateOrderStatusTracking error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Subscribe to notifications
export const subscribeNotification = async (req, res) => {
  try {
    const { orderId, type, timeOffset } = req.body;
    const userId = req.user.id;

    // For now, just return success - implement actual notification logic later
    res.json({
      message: 'Notification subscription created',
      subscription: {
        orderId,
        type,
        timeOffset,
        userId
      }
    });

  } catch (err) {
    console.error('subscribeNotification error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order statistics (admin only)
export const getOrderStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totals.finalCents' }
        }
      }
    ]);

    const totalOrders = await Order.countDocuments(matchStage);
    const totalRevenue = await Order.aggregate([
      { $match: { ...matchStage, status: 'DELIVERED' } },
      { $group: { _id: null, total: { $sum: '$totals.finalCents' } } }
    ]);

    res.json({
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      statusBreakdown: stats
    });

  } catch (err) {
    console.error('getOrderStats error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
