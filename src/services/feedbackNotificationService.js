// src/services/feedbackNotificationService.js
import Notification from '../models/notificationModel.js';
import Feedback from '../models/feedbackModel.js';
import User from '../models/userModel.js';
import FeedbackAuditLog from '../models/feedbackAuditLogModel.js';

class FeedbackNotificationService {
  /**
   * Send notification for new feedback submission
   */
  async notifyNewFeedback(feedbackId) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('user', 'name email')
        .populate('seller', 'name email restaurantName')
        .populate('deliveryAgent', 'name email')
        .populate('order', 'orderNumber');

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const notifications = [];

      // Notify seller about new review
      if (feedback.seller && feedback.target === 'seller') {
        const sellerNotification = {
          orderId: feedback.order._id,
          eventType: 'feedback.received',
          recipientType: 'seller',
          recipientId: feedback.seller._id,
          channel: 'email',
          status: 'pending',
          message: {
            title: 'New Review Received',
            body: `You received a ${feedback.rating}-star review for ${feedback.seller.restaurantName}: "${feedback.summary || feedback.detailedComment.substring(0, 100)}..."`,
            data: {
              feedbackId: feedback._id,
              rating: feedback.rating,
              orderNumber: feedback.order.orderNumber
            }
          },
          deliveryDetails: {
            email: feedback.seller.email
          }
        };
        notifications.push(sellerNotification);
      }

      // Notify delivery agent about new review
      if (feedback.deliveryAgent && feedback.target === 'delivery_agent') {
        const agentNotification = {
          orderId: feedback.order._id,
          eventType: 'feedback.received',
          recipientType: 'delivery_agent',
          recipientId: feedback.deliveryAgent._id,
          channel: 'email',
          status: 'pending',
          message: {
            title: 'New Delivery Review',
            body: `You received a ${feedback.rating}-star review for order ${feedback.order.orderNumber}: "${feedback.summary || feedback.detailedComment.substring(0, 100)}..."`,
            data: {
              feedbackId: feedback._id,
              rating: feedback.rating,
              orderNumber: feedback.order.orderNumber
            }
          },
          deliveryDetails: {
            email: feedback.deliveryAgent.email
          }
        };
        notifications.push(agentNotification);
      }

      // Notify user about feedback status
      const userNotification = {
        orderId: feedback.order._id,
        eventType: 'feedback.submitted',
        recipientType: 'user',
        recipientId: feedback.user._id,
        channel: 'email',
        status: 'pending',
        message: {
          title: 'Feedback Submitted',
          body: `Thank you for your feedback! Your ${feedback.rating}-star review is being reviewed and will be published soon.`,
          data: {
            feedbackId: feedback._id,
            rating: feedback.rating,
            status: feedback.status
          }
        },
        deliveryDetails: {
          email: feedback.user.email
        }
      };
      notifications.push(userNotification);

      // Save notifications
      const savedNotifications = await Promise.all(
        notifications.map(notif => new Notification(notif).save())
      );

      // Log the notifications
      await FeedbackAuditLog.createLog({
        entity: 'feedback',
        entityId: feedback._id,
        action: 'notification_sent',
        actor: { id: null, role: 'system' },
        context: {
          metadata: {
            notificationsSent: savedNotifications.map(n => ({
              recipientType: n.recipientType,
              channel: n.channel,
              eventType: n.eventType
            }))
          }
        },
        result: 'success',
        duration: 0
      });

      return savedNotifications;

    } catch (error) {
      console.error('Error sending new feedback notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification for feedback approval
   */
  async notifyFeedbackApproved(feedbackId) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('user', 'name email')
        .populate('seller', 'name email restaurantName')
        .populate('deliveryAgent', 'name email')
        .populate('order', 'orderNumber');

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const notifications = [];

      // Notify user that feedback is approved
      const userNotification = {
        orderId: feedback.order._id,
        eventType: 'feedback.approved',
        recipientType: 'user',
        recipientId: feedback.user._id,
        channel: 'email',
        status: 'pending',
        message: {
          title: 'Your Review is Live!',
          body: `Great news! Your ${feedback.rating}-star review has been approved and is now visible to everyone.`,
          data: {
            feedbackId: feedback._id,
            rating: feedback.rating,
            target: feedback.target
          }
        },
        deliveryDetails: {
          email: feedback.user.email
        }
      };
      notifications.push(userNotification);

      const savedNotifications = await Promise.all(
        notifications.map(notif => new Notification(notif).save())
      );

      return savedNotifications;

    } catch (error) {
      console.error('Error sending feedback approval notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification for feedback rejection
   */
  async notifyFeedbackRejected(feedbackId, reason) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('user', 'name email')
        .populate('order', 'orderNumber');

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const userNotification = {
        orderId: feedback.order._id,
        eventType: 'feedback.rejected',
        recipientType: 'user',
        recipientId: feedback.user._id,
        channel: 'email',
        status: 'pending',
        message: {
          title: 'Review Update',
          body: `We're sorry, but your review was not approved. ${reason ? `Reason: ${reason}` : ''} Please make sure your feedback follows our community guidelines.`,
          data: {
            feedbackId: feedback._id,
            reason: reason
          }
        },
        deliveryDetails: {
          email: feedback.user.email
        }
      };

      const savedNotification = await new Notification(userNotification).save();

      return savedNotification;

    } catch (error) {
      console.error('Error sending feedback rejection notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification for new report
   */
  async notifyNewReport(reportId) {
    try {
      const report = await require('../models/feedbackReportModel.js').default.findById(reportId)
        .populate('feedback', 'rating detailedComment')
        .populate('reporter', 'name email');

      if (!report) {
        throw new Error('Report not found');
      }

      // Get admin users
      const admins = await User.find({ role: 'admin', isBlocked: false });

      const notifications = await Promise.all(
        admins.map(admin => {
          const adminNotification = {
            orderId: report.feedback.orderId,
            eventType: 'feedback.report_received',
            recipientType: 'admin',
            recipientId: admin._id,
            channel: 'email',
            status: 'pending',
            message: {
              title: 'New Content Report',
              body: `A new report has been submitted for review. Reason: ${report.reasonDisplay}`,
              data: {
                reportId: report._id,
                feedbackId: report.feedback._id,
                reason: report.reason,
                priority: report.priority
              }
            },
            deliveryDetails: {
              email: admin.email
            }
          };
          return new Notification(adminNotification).save();
        })
      );

      return notifications;

    } catch (error) {
      console.error('Error sending new report notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification for report resolution
   */
  async notifyReportResolved(reportId) {
    try {
      const report = await require('../models/feedbackReportModel.js').default.findById(reportId)
        .populate('feedback')
        .populate('reporter', 'name email');

      if (!report) {
        throw new Error('Report not found');
      }

      const reporterNotification = {
        orderId: report.feedback.orderId,
        eventType: 'feedback.report_resolved',
        recipientType: 'user',
        recipientId: report.reporter._id,
        channel: 'email',
        status: 'pending',
        message: {
          title: 'Report Update',
          body: `Your report has been reviewed and resolved. Action taken: ${report.resolutionActionDisplay}`,
          data: {
            reportId: report._id,
            resolution: report.resolution?.action,
            action: report.resolution?.action
          }
        },
        deliveryDetails: {
          email: report.reporter.email
        }
      };

      const savedNotification = await new Notification(reporterNotification).save();

      return savedNotification;

    } catch (error) {
      console.error('Error sending report resolution notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification for moderation actions (bulk operations)
   */
  async notifyBulkModeration(affectedUserIds, action, count, adminName) {
    try {
      const notifications = await Promise.all(
        affectedUserIds.map(userId => {
          const notification = {
            orderId: null,
            eventType: 'feedback.bulk_moderation',
            recipientType: 'user',
            recipientId: userId,
            channel: 'email',
            status: 'pending',
            message: {
              title: 'Bulk Content Update',
              body: `An administrator (${adminName}) has performed a bulk ${action} operation affecting ${count} of your reviews.`,
              data: {
                action,
                count,
                adminName
              }
            }
          };
          return new Notification(notification).save();
        })
      );

      return notifications;

    } catch (error) {
      console.error('Error sending bulk moderation notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification for feedback replies
   */
  async notifyFeedbackReply(feedbackId, replyId) {
    try {
      const feedback = await Feedback.findById(feedbackId)
        .populate('user', 'name email');

      if (!feedback) {
        throw new Error('Feedback not found');
      }

      const reply = feedback.replies.id(replyId);
      if (!reply) {
        throw new Error('Reply not found');
      }

      const userNotification = {
        orderId: feedback.order._id,
        eventType: 'feedback.reply_received',
        recipientType: 'user',
        recipientId: feedback.user._id,
        channel: 'email',
        status: 'pending',
        message: {
          title: 'Response to Your Review',
          body: `The ${reply.authorRole} has replied to your review: "${reply.message.substring(0, 100)}..."`,
          data: {
            feedbackId: feedback._id,
            replyId: reply._id,
            authorRole: reply.authorRole
          }
        },
        deliveryDetails: {
          email: feedback.user.email
        }
      };

      const savedNotification = await new Notification(userNotification).save();

      return savedNotification;

    } catch (error) {
      console.error('Error sending feedback reply notifications:', error);
      throw error;
    }
  }

  /**
   * Send daily digest notifications
   */
  async sendDailyDigest() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get feedback stats for yesterday
      const yesterdayFeedback = await Feedback.find({
        createdAt: {
          $gte: yesterday,
          $lt: today
        }
      }).populate('seller', 'name restaurantName');

      // Group by seller
      const sellerStats = {};
      yesterdayFeedback.forEach(feedback => {
        if (feedback.seller) {
          const sellerId = feedback.seller._id.toString();
          if (!sellerStats[sellerId]) {
            sellerStats[sellerId] = {
              seller: feedback.seller,
              count: 0,
              totalRating: 0,
              avgRating: 0
            };
          }
          sellerStats[sellerId].count++;
          sellerStats[sellerId].totalRating += feedback.rating;
        }
      });

      // Calculate averages and send digest
      const notifications = [];
      for (const [sellerId, stats] of Object.entries(sellerStats)) {
        stats.avgRating = stats.totalRating / stats.count;

        const digestNotification = {
          orderId: null,
          eventType: 'feedback.daily_digest',
          recipientType: 'seller',
          recipientId: sellerId,
          channel: 'email',
          status: 'pending',
          message: {
            title: 'Daily Review Summary',
            body: `Yesterday you received ${stats.count} new reviews with an average rating of ${stats.avgRating.toFixed(1)} stars.`,
            data: {
              date: yesterday.toISOString().split('T')[0],
              count: stats.count,
              avgRating: stats.avgRating
            }
          },
          deliveryDetails: {
            email: stats.seller.email
          }
        };
        notifications.push(digestNotification);
      }

      const savedNotifications = await Promise.all(
        notifications.map(notif => new Notification(notif).save())
      );

      return savedNotifications;

    } catch (error) {
      console.error('Error sending daily digest notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        status: { $in: ['sent', 'failed'] }
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);

      return result.deletedCount;

    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(timeRange = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const stats = await Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            eventType: { $regex: '^feedback\.' }
          }
        },
        {
          $group: {
            _id: {
              eventType: '$eventType',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.eventType',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        }
      ]);

      return stats;

    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
}

export default new FeedbackNotificationService();