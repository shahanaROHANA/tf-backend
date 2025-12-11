import notificationService from './notificationService.js';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Seller from '../models/Seller.js';

// Simple in-memory queue for development (replace with Redis/BullMQ for production)
class InMemoryQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async add(jobData) {
    this.queue.push(jobData);
    this.processQueue();
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        if (job.type === 'notification') {
          await notificationService.sendNotification(job.data);
        } else if (job.type === 'order-event') {
          await this.processOrderEvent(job.data.eventType, job.data.orderId, job.data.orderData);
        } else if (job.type === 'product-event') {
          await this.processProductEvent(job.data.eventType, job.data.productId, job.data.productData);
        }
      } catch (error) {
        console.error('Queue job failed:', error);
      }
    }

    this.processing = false;
  }

  async processOrderEvent(eventType, orderId, orderData) {
    // Delegate to the main QueueService instance
    const queueService = new QueueService();
    return queueService.processOrderEvent(eventType, orderId, orderData);
  }

  async processProductEvent(eventType, productId, productData) {
    // Delegate to the main QueueService instance
    const queueService = new QueueService();
    return queueService.processProductEvent(eventType, productId, productData);
  }
}

const inMemoryQueue = new InMemoryQueue();

class QueueService {
  constructor() {
    // Use in-memory queue for development
  }

  // Emit order event
  async emitOrderEvent(eventType, orderId, orderData = {}) {
    try {
      // Use in-memory queue for development
      setTimeout(async () => {
        await inMemoryQueue.add({
          type: 'order-event',
          data: { eventType, orderId, orderData }
        });
      }, 1000); // Small delay to ensure DB consistency
    } catch (error) {
      console.error('Emit order event error:', error);
    }
  }

  // Emit product event
  async emitProductEvent(eventType, productId, productData = {}) {
    try {
      // Use in-memory queue for development
      setTimeout(async () => {
        await inMemoryQueue.add({
          type: 'product-event',
          data: { eventType, productId, productData }
        });
      }, 500); // Small delay
    } catch (error) {
      console.error('Emit product event error:', error);
    }
  }

  // Process order event and create notifications
  async processOrderEvent(eventType, orderId, orderData = {}) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'name email phone')
        .populate('items.product', 'name')
        .populate('items.seller', 'name email phone webhookUrl')
        .populate('assignedDriver', 'name email phone pushToken');

      if (!order) {
        console.error('Order not found for event:', orderId);
        return;
      }

      const notifications = [];

      switch (eventType) {
        case 'order.created':
          notifications.push(...await this.createOrderCreatedNotifications(order));
          break;

        case 'order.assigned':
          notifications.push(...await this.createOrderAssignedNotifications(order));
          break;

        case 'order.accepted':
          notifications.push(...await this.createOrderAcceptedNotifications(order));
          break;

        case 'order.picked_up':
          notifications.push(...await this.createOrderPickedUpNotifications(order));
          break;

        case 'order.delivered':
          notifications.push(...await this.createOrderDeliveredNotifications(order));
          break;

        case 'order.cancelled':
          notifications.push(...await this.createOrderCancelledNotifications(order));
          break;
      }

      // Queue notifications
      for (const notificationData of notifications) {
        const notification = await notificationService.createNotification(notificationData);
        // Use in-memory queue for development
        setTimeout(async () => {
          await inMemoryQueue.add({
            type: 'notification',
            data: notification
          });
        }, 500);
      }

    } catch (error) {
      console.error('Process order event error:', error);
    }
  }

  // Create notifications for order.created event
  async createOrderCreatedNotifications(order) {
    const notifications = [];
    const orderSummary = this.getOrderSummary(order);

    // Notify sellers
    const sellerIds = [...new Set(order.items.map(item => item.seller._id.toString()))];
    for (const sellerId of sellerIds) {
      const seller = order.items.find(item => item.seller._id.toString() === sellerId)?.seller;
      if (seller) {
        // Email notification
        notifications.push({
          orderId: order._id,
          eventType: 'order.created',
          recipientType: 'seller',
          recipientId: seller._id,
          channel: 'email',
          message: {
            title: `New order #${order.orderNumber}`,
            body: `
              <h3>New Order Received</h3>
              <p>You received a new order at ${order.station || 'station'}.</p>
              <p><strong>Order #${order.orderNumber}</strong></p>
              <p><strong>Items:</strong> ${orderSummary}</p>
              <p><strong>Customer:</strong> ${order.user.name}</p>
              <p><strong>Total:</strong> ₹${(order.totals.finalCents / 100).toFixed(2)}</p>
              <a href="${process.env.FRONTEND_URL}/seller/orders/${order._id}">View Order</a>
            `,
            data: { orderId: order._id, orderNumber: order.orderNumber }
          },
          deliveryDetails: {
            email: seller.email
          }
        });

        // Socket notification (real-time)
        notifications.push({
          orderId: order._id,
          eventType: 'order.created',
          recipientType: 'seller',
          recipientId: seller._id,
          channel: 'socket',
          message: {
            title: 'New Order',
            body: `Order #${order.orderNumber} - ${orderSummary}`,
            data: { orderId: order._id, orderNumber: order.orderNumber, items: orderSummary }
          },
          deliveryDetails: {
            socketId: `seller_${seller._id}` // Will be managed by socket server
          }
        });

        // Webhook if configured
        if (seller.webhookUrl) {
          notifications.push({
            orderId: order._id,
            eventType: 'order.created',
            recipientType: 'seller',
            recipientId: seller._id,
            channel: 'webhook',
            message: {
              title: 'New Order',
              body: `Order #${order.orderNumber} received`,
              data: {
                orderId: order._id,
                orderNumber: order.orderNumber,
                items: order.items,
                total: order.totals.finalCents,
                customer: order.user
              }
            },
            deliveryDetails: {
              webhookUrl: seller.webhookUrl
            }
          });
        }
      }
    }

    // Notify admin
    const adminUsers = await User.find({ role: 'admin' });
    for (const admin of adminUsers) {
      notifications.push({
        orderId: order._id,
        eventType: 'order.created',
        recipientType: 'admin',
        recipientId: admin._id,
        channel: 'email',
        message: {
          title: `Order placed: #${order.orderNumber}`,
          body: `
            <h3>New Order Placed</h3>
            <p><strong>Order #${order.orderNumber}</strong></p>
            <p><strong>Customer:</strong> ${order.user.name} (${order.user.email})</p>
            <p><strong>Items:</strong> ${orderSummary}</p>
            <p><strong>Total:</strong> ₹${(order.totals.finalCents / 100).toFixed(2)}</p>
            <a href="${process.env.ADMIN_URL}/orders/${order._id}">View Order</a>
          `,
          data: { orderId: order._id, orderNumber: order.orderNumber }
        },
        deliveryDetails: {
          email: admin.email
        }
      });
    }

    return notifications;
  }

  // Create notifications for order.assigned event
  async createOrderAssignedNotifications(order) {
    const notifications = [];
    const orderSummary = this.getOrderSummary(order);

    if (order.assignedDriver) {
      // Push notification to delivery agent
      notifications.push({
        orderId: order._id,
        eventType: 'order.assigned',
        recipientType: 'delivery_agent',
        recipientId: order.assignedDriver._id,
        channel: 'push',
        message: {
          title: `New pickup: #${order.orderNumber}`,
          body: `Pickup at ${order.station || 'station'}. Items: ${orderSummary}`,
          data: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            station: order.station,
            eta: order.expectedReadyAt
          }
        },
        deliveryDetails: {
          pushToken: order.assignedDriver.pushToken
        }
      });

      // SMS fallback
      if (order.assignedDriver.phone) {
        notifications.push({
          orderId: order._id,
          eventType: 'order.assigned',
          recipientType: 'delivery_agent',
          recipientId: order.assignedDriver._id,
          channel: 'sms',
          message: {
            title: 'New Pickup',
            body: `New pickup for order ${order.orderNumber} at ${order.station || 'station'}. Reply ACCEPT ${order.orderNumber} to accept.`
          },
          deliveryDetails: {
            phone: order.assignedDriver.phone
          }
        });
      }
    }

    return notifications;
  }

  // Create notifications for order.accepted event
  async createOrderAcceptedNotifications(order) {
    const notifications = [];

    // Notify user
    notifications.push({
      orderId: order._id,
      eventType: 'order.accepted',
      recipientType: 'user',
      recipientId: order.user._id,
      channel: 'socket', // Real-time update
      message: {
        title: 'Order Accepted',
        body: `Your order #${order.orderNumber} has been accepted by the delivery agent.`,
        data: { orderId: order._id, status: 'accepted' }
      },
      deliveryDetails: {
        socketId: `user_${order.user._id}`
      }
    });

    return notifications;
  }

  // Create notifications for order.picked_up event
  async createOrderPickedUpNotifications(order) {
    const notifications = [];

    // Notify user
    notifications.push({
      orderId: order._id,
      eventType: 'order.picked_up',
      recipientType: 'user',
      recipientId: order.user._id,
      channel: 'socket',
      message: {
        title: 'Order Picked Up',
        body: `Your order #${order.orderNumber} has been picked up and is on the way.`,
        data: { orderId: order._id, status: 'picked_up' }
      },
      deliveryDetails: {
        socketId: `user_${order.user._id}`
      }
    });

    return notifications;
  }

  // Create notifications for order.delivered event
  async createOrderDeliveredNotifications(order) {
    const notifications = [];

    // Notify user
    notifications.push({
      orderId: order._id,
      eventType: 'order.delivered',
      recipientType: 'user',
      recipientId: order.user._id,
      channel: 'socket',
      message: {
        title: 'Order Delivered',
        body: `Your order #${order.orderNumber} has been delivered successfully!`,
        data: { orderId: order._id, status: 'delivered' }
      },
      deliveryDetails: {
        socketId: `user_${order.user._id}`
      }
    });

    return notifications;
  }

  // Create notifications for order.cancelled event
  async createOrderCancelledNotifications(order) {
    const notifications = [];

    // Notify user
    notifications.push({
      orderId: order._id,
      eventType: 'order.cancelled',
      recipientType: 'user',
      recipientId: order.user._id,
      channel: 'socket',
      message: {
        title: 'Order Cancelled',
        body: `Your order #${order.orderNumber} has been cancelled.`,
        data: { orderId: order._id, status: 'cancelled' }
      },
      deliveryDetails: {
        socketId: `user_${order.user._id}`
      }
    });

    return notifications;
  }

  // Process product event and emit socket notifications
  async processProductEvent(eventType, productId, productData = {}) {
    try {
      if (eventType === 'product.created') {
        // Broadcast new product to all connected users (customers)
        socketService.broadcast('product.created', {
          product: productData.product,
          restaurantName: productData.restaurantName
        });

        console.log(`Product ${productId} created and broadcasted to all users`);
      }
    } catch (error) {
      console.error('Process product event error:', error);
    }
  }

  // Helper function to get order summary
  getOrderSummary(order) {
    const items = order.items.map(item => `${item.name} x${item.qty}`).join(', ');
    return items.length > 100 ? items.substring(0, 100) + '...' : items;
  }

  // Graceful shutdown
  async close() {
    // In-memory queue doesn't need cleanup
  }
}

export default new QueueService();