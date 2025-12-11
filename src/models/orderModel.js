// src/models/orderModel.js
import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true }, // Store product name for reference
  qty: { type: Number, default: 1, required: true },
  priceCents: { type: Number, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true },
  itemStatus: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED'],
    default: 'PENDING'
  },
  itemNote: { type: String }, // Special instructions for this item
  options: [{ // Customization options like chutney, extra, etc.
    name: String,
    value: String,
    priceCents: Number
  }]
});

// Delivery information schema for train-specific delivery
const deliveryInfoSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['train', 'station', 'home'],
    required: true
  },
  // Train delivery details
  trainNo: { type: String },
  trainName: { type: String },
  coach: { type: String },
  seat: { type: String },
  departureTime: { type: Date },
  // Station pickup details
  stationName: { type: String },
  platform: { type: String },
  // Home delivery details
  address: { type: String },
  landmark: { type: String },
  // Common fields
  contactName: { type: String, required: true },
  contactPhone: { type: String, required: true },
  specialInstructions: { type: String }
});

// Order totals schema
const totalsSchema = new mongoose.Schema({
  subtotalCents: { type: Number, required: true },
  taxCents: { type: Number, default: 0 },
  deliveryCents: { type: Number, default: 2000 }, // Default ₹20 delivery fee
  discountCents: { type: Number, default: 0 },
  couponCode: { type: String },
  finalCents: { type: Number, required: true }
});

// Payment information schema
const paymentSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['UPI', 'CARD', 'WALLET', 'COD'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  gatewayId: { type: String }, // Stripe payment intent ID or UPI transaction ID
  paidAt: { type: Date },
  refundAmountCents: { type: Number },
  refundReason: { type: String }
});

// Order status history for audit trail
const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who changed the status
  note: { type: String }
});

// Main order schema
const orderSchema = new mongoose.Schema({
  orderNumber: { 
    type: String, 
    unique: true, 
    required: true,
    default: () => 'TF' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase()
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema],
  
  // Delivery information
  deliveryInfo: deliveryInfoSchema,
  
  // Order totals
  totals: totalsSchema,
  
  // Payment information
  payment: paymentSchema,
  
  // Overall order status
  status: {
    type: String,
    enum: [
      'PENDING',           // Order placed, awaiting payment confirmation
      'CONFIRMED',         // Payment confirmed, order accepted
      'PREPARING',         // Kitchen started cooking
      'READY_FOR_PICKUP',  // Food ready, waiting for delivery partner
      'OUT_FOR_DELIVERY',  // Delivery person picked up
      'DELIVERED',         // Order delivered successfully
      'CANCELLED',         // Order cancelled (user/admin)
      'REJECTED',          // Order rejected by seller
      'RETURNED',          // Order returned after delivery
      'FAILED_PAYMENT'     // Payment failed
    ],
    default: 'PENDING'
  },

  // Train schedule and tracking fields
  trainNo: { type: String }, // Redundant with deliveryInfo.trainNo but for quick access
  station: { type: String }, // User's station name
  stationIndex: { type: Number }, // Index in train schedule
  scheduledArrival: { type: Date }, // Scheduled arrival at user's station
  scheduledDepart: { type: Date }, // Scheduled departure from user's station
  prepTimeMinutes: { type: Number, default: 20 }, // Restaurant prep time
  expectedReadyAt: { type: Date }, // When seller should have food ready
  statusHistory: [{
    status: { type: String, required: true },
    time: { type: Date, default: Date.now }
  }],
  
  // Delivery tracking
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  estimatedDeliveryTime: { type: Date },
  
  // Timestamps for each stage
  timestamps: {
    placedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    preparingAt: { type: Date },
    readyForPickupAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date }
  },
  
  // Status history for audit
  history: [statusHistorySchema],
  
  // Additional fields
  cancellationReason: { type: String },
  rejectionReason: { type: String },
  specialInstructions: { type: String }, // Order-level special instructions
  rating: { type: Number, min: 1, max: 5 },
  review: { type: String },
  idempotencyKey: { type: String, unique: true, sparse: true } // Prevent duplicate orders
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'deliveryInfo.trainNo': 1 });

// Virtual for formatted order total
orderSchema.virtual('formattedTotal').get(function() {
  if (!this.totals || this.totals.finalCents === undefined) {
    return '0.00';
  }
  return (this.totals.finalCents / 100).toFixed(2);
});

// Virtual for order status with human readable format
orderSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'PENDING': 'Order Pending',
    'CONFIRMED': 'Order Confirmed',
    'PREPARING': 'Preparing Food',
    'READY_FOR_PICKUP': 'Ready for Pickup',
    'OUT_FOR_DELIVERY': 'Out for Delivery',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled',
    'REJECTED': 'Rejected',
    'RETURNED': 'Returned',
    'FAILED_PAYMENT': 'Payment Failed'
  };
  return statusMap[this.status] || this.status;
});

// Pre-save middleware to update timestamps
orderSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.isModified('status')) {
    // Add to history
    this.history.push({
      status: this.status,
      at: now,
      by: this._doc.updatedBy || this.user
    });
    
    // Update specific timestamps based on status
    switch (this.status) {
      case 'CONFIRMED':
        if (!this.timestamps.confirmedAt) this.timestamps.confirmedAt = now;
        break;
      case 'PREPARING':
        if (!this.timestamps.preparingAt) this.timestamps.preparingAt = now;
        break;
      case 'READY_FOR_PICKUP':
        if (!this.timestamps.readyForPickupAt) this.timestamps.readyForPickupAt = now;
        break;
      case 'OUT_FOR_DELIVERY':
        if (!this.timestamps.outForDeliveryAt) this.timestamps.outForDeliveryAt = now;
        break;
      case 'DELIVERED':
        if (!this.timestamps.deliveredAt) this.timestamps.deliveredAt = now;
        break;
      case 'CANCELLED':
        if (!this.timestamps.cancelledAt) this.timestamps.cancelledAt = now;
        break;
    }
  }
  
  next();
});

export default mongoose.model('Order', orderSchema);
