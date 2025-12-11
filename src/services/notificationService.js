import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { Expo } from 'expo-server-sdk';
import axios from 'axios';
import Notification from '../models/notificationModel.js';
import socketService from './socketService.js';

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Expo push client
const expo = new Expo();

class NotificationService {
  // Send email notification
  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@trainfood.com',
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const result = await emailTransporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSMS(to, message) {
    try {
      if (!process.env.TWILIO_PHONE_NUMBER) {
        return { success: false, error: 'Twilio not configured' };
      }

      const result = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send push notification
  async sendPush(pushToken, title, body, data = {}) {
    try {
      if (!Expo.isExpoPushToken(pushToken)) {
        return { success: false, error: 'Invalid Expo push token' };
      }

      const message = {
        to: pushToken,
        title,
        body,
        data,
        sound: 'default',
        priority: 'default'
      };

      const ticket = await expo.sendPushNotificationsAsync([message]);
      return { success: true, ticket };
    } catch (error) {
      console.error('Push send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send webhook notification
  async sendWebhook(url, payload, headers = {}) {
    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TrainFood-Webhook/1.0',
          ...headers
        },
        timeout: 10000
      });

      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      console.error('Webhook send error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send socket notification
  async sendSocket(recipientId, event, data) {
    try {
      // Determine recipient type and send to appropriate socket
      const recipientType = data.recipientType || 'user';

      let sent = false;
      switch (recipientType) {
        case 'user':
          sent = socketService.sendToUser(recipientId, event, data);
          break;
        case 'seller':
          sent = socketService.sendToSeller(recipientId, event, data);
          break;
        case 'admin':
          sent = socketService.sendToAdmin(recipientId, event, data);
          break;
        case 'delivery_agent':
          sent = socketService.sendToDeliveryAgent(recipientId, event, data);
          break;
      }

      return { success: sent, recipientId, event };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create notification record
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  // Update notification status
  async updateNotificationStatus(notificationId, status, attemptData = {}) {
    try {
      const updateData = {
        status,
        [`${status}At`]: new Date()
      };

      if (status === 'sent') {
        updateData.sentAt = new Date();
      } else if (status === 'failed') {
        updateData.failedAt = new Date();
      }

      if (attemptData) {
        updateData.$push = { attempts: attemptData };
        if (status === 'retried') {
          updateData.$inc = { retryCount: 1 };
        }
      }

      await Notification.findByIdAndUpdate(notificationId, updateData);
    } catch (error) {
      console.error('Update notification status error:', error);
    }
  }

  // Send notification through appropriate channel
  async sendNotification(notification) {
    let result;

    try {
      await this.updateNotificationStatus(notification._id, 'pending', {
        status: 'sending',
        timestamp: new Date()
      });

      switch (notification.channel) {
        case 'email':
          result = await this.sendEmail(
            notification.deliveryDetails.email,
            notification.message.title,
            notification.message.body
          );
          break;

        case 'sms':
          result = await this.sendSMS(
            notification.deliveryDetails.phone,
            notification.message.body
          );
          break;

        case 'push':
          result = await this.sendPush(
            notification.deliveryDetails.pushToken,
            notification.message.title,
            notification.message.body,
            notification.message.data
          );
          break;

        case 'webhook':
          result = await this.sendWebhook(
            notification.deliveryDetails.webhookUrl,
            {
              eventType: notification.eventType,
              orderId: notification.orderId,
              ...notification.message
            }
          );
          break;

        case 'socket':
          result = await this.sendSocket(
            notification.recipientId,
            notification.eventType,
            {
              ...notification.message,
              recipientType: notification.recipientType
            }
          );
          break;

        default:
          result = { success: false, error: 'Unknown channel' };
      }

      if (result.success) {
        await this.updateNotificationStatus(notification._id, 'sent', {
          status: 'sent',
          response: result
        });
      } else {
        await this.updateNotificationStatus(notification._id, 'failed', {
          status: 'failed',
          error: result.error
        });
      }

      return result;
    } catch (error) {
      await this.updateNotificationStatus(notification._id, 'failed', {
        status: 'error',
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  // Retry failed notifications
  async retryFailedNotifications() {
    try {
      const failedNotifications = await Notification.find({
        status: 'failed',
        retryCount: { $lt: 3 }
      });

      for (const notification of failedNotifications) {
        await this.updateNotificationStatus(notification._id, 'retried');
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('Retry notifications error:', error);
    }
  }
}

export default new NotificationService();