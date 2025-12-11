import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['order.created', 'order.assigned', 'order.accepted', 'order.picked_up', 'order.in_transit', 'order.delivered', 'order.cancelled']
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['seller', 'admin', 'delivery_agent', 'user']
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  channel: {
    type: String,
    required: true,
    enum: ['email', 'sms', 'push', 'socket', 'webhook']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'failed', 'retried'],
    default: 'pending'
  },
  message: {
    title: String,
    body: String,
    data: mongoose.Schema.Types.Mixed
  },
  deliveryDetails: {
    email: String,
    phone: String,
    pushToken: String,
    webhookUrl: String,
    socketId: String
  },
  attempts: [{
    timestamp: { type: Date, default: Date.now },
    status: String,
    error: String,
    response: mongoose.Schema.Types.Mixed
  }],
  sentAt: Date,
  failedAt: Date,
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ orderId: 1, eventType: 1 });
notificationSchema.index({ recipientId: 1, status: 1 });
notificationSchema.index({ status: 1, createdAt: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;