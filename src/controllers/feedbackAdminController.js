// src/controllers/feedbackAdminController.js
import Feedback from '../models/feedbackModel.js';
import FeedbackReport from '../models/feedbackReportModel.js';
import FeedbackAuditLog from '../models/feedbackAuditLogModel.js';
import User from '../models/userModel.js';

// Get moderation queue
export const getModerationQueue = async (req, res) => {
  try {
    const { 
      status = 'pending',
      priority,
      reason,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'asc'
    } = req.query;

    let query = { status: { $in: Array.isArray(status) ? status : [status] } };

    if (priority) {
      query.priority = priority;
    }

    if (reason) {
      query.reason = reason;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const feedback = await Feedback.find(query)
      .populate('user', 'name email')
      .populate('seller', 'name restaurantName')
      .populate('deliveryAgent', 'name')
      .populate('order', 'orderNumber deliveryInfo')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting moderation queue:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get reports queue
export const getReportsQueue = async (req, res) => {
  try {
    const { 
      status = ['pending', 'reviewing'],
      priority,
      reason,
      page = 1,
      limit = 20,
      sortBy = 'priority',
      sortOrder = 'desc'
    } = req.query;

    let query = { status: { $in: Array.isArray(status) ? status : [status] } };

    if (priority) {
      query.priority = priority;
    }

    if (reason) {
      query.reason = reason;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const reports = await FeedbackReport.find(query)
      .populate('feedback', 'rating detailedComment feedbackId')
      .populate('reporter', 'name email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FeedbackReport.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting reports queue:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Approve feedback
export const approveFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { reason = '', notes = '' } = req.body;
    const adminId = req.user.id;

    const feedback = await Feedback.findById(feedbackId)
      .populate('user', 'name email')
      .populate('seller', 'name email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const previousStatus = feedback.status;

    // Update feedback status
    feedback.status = 'approved';
    feedback.isPublic = true;
    feedback.publishedAt = new Date();
    
    feedback.moderationHistory.push({
      action: 'approved',
      reason,
      moderatedBy: adminId,
      moderatedAt: new Date(),
      previousStatus,
      notes
    });

    await feedback.save();

    // Log the action
    await FeedbackAuditLog.createLog({
      entity: 'feedback',
      entityId: feedback._id,
      action: 'feedback_approved',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        previousValues: { status: previousStatus },
        newValues: { status: 'approved', isPublic: true },
        notes
      },
      result: 'success',
      duration: 0
    });

    // Notify relevant parties (implement based on your notification system)
    // e.g., notify user that their feedback was approved, notify seller of new review

    res.json({
      success: true,
      message: 'Feedback approved successfully',
      data: {
        feedbackId: feedback._id,
        status: feedback.status,
        publishedAt: feedback.publishedAt
      }
    });

  } catch (error) {
    console.error('Error approving feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Reject feedback
export const rejectFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { reason = '', notes = '' } = req.body;
    const adminId = req.user.id;

    const feedback = await Feedback.findById(feedbackId)
      .populate('user', 'name email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const previousStatus = feedback.status;

    // Update feedback status
    feedback.status = 'rejected';
    feedback.isPublic = false;
    
    feedback.moderationHistory.push({
      action: 'rejected',
      reason,
      moderatedBy: adminId,
      moderatedAt: new Date(),
      previousStatus,
      notes
    });

    await feedback.save();

    // Log the action
    await FeedbackAuditLog.createLog({
      entity: 'feedback',
      entityId: feedback._id,
      action: 'feedback_rejected',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        previousValues: { status: previousStatus },
        newValues: { status: 'rejected', isPublic: false },
        reason,
        notes
      },
      result: 'success',
      duration: 0
    });

    res.json({
      success: true,
      message: 'Feedback rejected successfully',
      data: {
        feedbackId: feedback._id,
        status: feedback.status
      }
    });

  } catch (error) {
    console.error('Error rejecting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Edit feedback (admin edit)
export const editFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { 
      rating,
      summary,
      detailedComment,
      tags,
      isPublic = true 
    } = req.body;
    const adminId = req.user.id;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Store previous values for audit log
    const previousValues = {
      rating: feedback.rating,
      summary: feedback.summary,
      detailedComment: feedback.detailedComment,
      tags: feedback.tags,
      isPublic: feedback.isPublic
    };

    // Update fields if provided
    if (rating !== undefined) feedback.rating = rating;
    if (summary !== undefined) feedback.summary = summary;
    if (detailedComment !== undefined) feedback.detailedComment = detailedComment;
    if (tags !== undefined) feedback.tags = tags;
    if (isPublic !== undefined) feedback.isPublic = isPublic;

    // Add to moderation history
    feedback.moderationHistory.push({
      action: 'edited',
      reason: 'Admin edit',
      moderatedBy: adminId,
      moderatedAt: new Date(),
      previousStatus: feedback.status,
      notes: 'Content edited by admin'
    });

    await feedback.save();

    // Log the action
    await FeedbackAuditLog.createLog({
      entity: 'feedback',
      entityId: feedback._id,
      action: 'feedback_updated',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        previousValues,
        newValues: {
          rating: feedback.rating,
          summary: feedback.summary,
          detailedComment: feedback.detailedComment,
          tags: feedback.tags,
          isPublic: feedback.isPublic
        }
      },
      result: 'success',
      duration: 0
    });

    res.json({
      success: true,
      message: 'Feedback updated successfully',
      data: { feedback }
    });

  } catch (error) {
    console.error('Error editing feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Resolve report
export const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { 
      action,
      reason,
      notes = ''
    } = req.body;
    const adminId = req.user.id;

    const report = await FeedbackReport.findById(reportId)
      .populate('feedback')
      .populate('reporter', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const previousStatus = report.status;

    // Update report status
    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.resolvedBy = adminId;
    report.resolution = {
      action,
      reason,
      notes
    };

    // Process the feedback based on action
    const feedback = await Feedback.findById(report.feedback._id);
    if (feedback) {
      switch (action) {
        case 'feedback_removed':
          feedback.status = 'rejected';
          feedback.isPublic = false;
          break;
        case 'feedback_hidden':
          feedback.isPublic = false;
          break;
        case 'feedback_edited':
          // Feedback was already edited separately
          break;
        case 'warning_issued':
          // Add warning to user's record (implement user warning system)
          break;
        case 'account_suspended':
          // Suspend user's account (implement user suspension)
          break;
        default:
          // no_action_needed
          break;
      }

      feedback.moderationHistory.push({
        action: 'processed',
        reason: `Report resolved: ${action}`,
        moderatedBy: adminId,
        moderatedAt: new Date(),
        previousStatus: feedback.status,
        notes
      });

      await feedback.save();
    }

    await report.save();

    // Log the resolution
    await FeedbackAuditLog.createLog({
      entity: 'feedback_report',
      entityId: report._id,
      action: 'report_resolved',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        feedbackId: feedback?._id,
        action,
        reason,
        notes,
        reporter: report.reporter
      },
      result: 'success',
      duration: 0
    });

    res.json({
      success: true,
      message: 'Report resolved successfully',
      data: {
        reportId: report._id,
        status: report.status,
        resolution: report.resolution
      }
    });

  } catch (error) {
    console.error('Error resolving report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Dismiss report
export const dismissReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { reason, notes = '' } = req.body;
    const adminId = req.user.id;

    const report = await FeedbackReport.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const previousStatus = report.status;

    report.status = 'dismissed';
    report.resolvedAt = new Date();
    report.resolvedBy = adminId;
    report.resolution = {
      action: 'no_action_needed',
      reason: reason || 'Report dismissed',
      notes
    };

    await report.save();

    // Reset feedback status if it was flagged
    const feedback = await Feedback.findById(report.feedback);
    if (feedback && feedback.status === 'flagged') {
      feedback.status = 'approved'; // Reset to approved
      feedback.moderationHistory.push({
        action: 'unflagged',
        reason: 'Report dismissed',
        moderatedBy: adminId,
        moderatedAt: new Date(),
        previousStatus: 'flagged',
        notes
      });
      await feedback.save();
    }

    // Log the dismissal
    await FeedbackAuditLog.createLog({
      entity: 'feedback_report',
      entityId: report._id,
      action: 'report_dismissed',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        feedbackId: feedback?._id,
        reason,
        notes
      },
      result: 'success',
      duration: 0
    });

    res.json({
      success: true,
      message: 'Report dismissed successfully',
      data: {
        reportId: report._id,
        status: report.status
      }
    });

  } catch (error) {
    console.error('Error dismissing report:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedback statistics for admin dashboard
export const getAdminFeedbackStats = async (req, res) => {
  try {
    const { timeRange = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Get feedback statistics
    const feedbackStats = await Feedback.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    // Get report statistics
    const reportStats = await FeedbackReport.getStatistics(parseInt(timeRange));

    // Get audit log statistics
    const auditStats = await FeedbackAuditLog.getSystemHealthMetrics(parseInt(timeRange));

    // Combine stats
    const stats = {
      feedback: {
        total: feedbackStats.reduce((sum, stat) => sum + stat.count, 0),
        byStatus: feedbackStats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgRating: Math.round(stat.avgRating * 10) / 10
          };
          return acc;
        }, {}),
        pendingReview: feedbackStats.find(s => s._id === 'pending')?.count || 0,
        approved: feedbackStats.find(s => s._id === 'approved')?.count || 0,
        rejected: feedbackStats.find(s => s._id === 'rejected')?.count || 0,
        flagged: feedbackStats.find(s => s._id === 'flagged')?.count || 0
      },
      reports: reportStats,
      audit: auditStats[0] || {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        avgDuration: 0,
        highRiskActions: 0
      },
      timeRange: parseInt(timeRange)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting admin feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Bulk operations
export const bulkModerateFeedback = async (req, res) => {
  try {
    const { feedbackIds, action, reason = '', notes = '' } = req.body;
    const adminId = req.user.id;

    if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'feedbackIds array is required'
      });
    }

    if (!['approve', 'reject', 'flag'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be approve, reject, or flag'
      });
    }

    const results = {
      success: [],
      failed: []
    };

    // Start audit log for bulk operation
    await FeedbackAuditLog.createLog({
      entity: 'admin_action',
      entityId: null,
      action: 'bulk_operation_started',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        feedbackIds,
        action,
        reason,
        notes
      },
      result: 'success',
      duration: 0
    });

    for (const feedbackId of feedbackIds) {
      try {
        const feedback = await Feedback.findById(feedbackId);
        if (!feedback) {
          results.failed.push({
            feedbackId,
            error: 'Feedback not found'
          });
          continue;
        }

        const previousStatus = feedback.status;

        switch (action) {
          case 'approve':
            feedback.status = 'approved';
            feedback.isPublic = true;
            feedback.publishedAt = new Date();
            break;
          case 'reject':
            feedback.status = 'rejected';
            feedback.isPublic = false;
            break;
          case 'flag':
            feedback.status = 'flagged';
            break;
        }

        feedback.moderationHistory.push({
          action,
          reason: `${reason} (Bulk operation)`,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          previousStatus,
          notes
        });

        await feedback.save();
        results.success.push(feedbackId);

        // Log individual action
        await FeedbackAuditLog.createLog({
          entity: 'feedback',
          entityId: feedback._id,
          action: `feedback_${action}ed`,
          actor: {
            id: adminId,
            role: 'admin',
            name: req.user.name
          },
          context: {
            previousValues: { status: previousStatus },
            newValues: { status: feedback.status },
            bulkOperation: true
          },
          result: 'success',
          duration: 0
        });

      } catch (error) {
        results.failed.push({
          feedbackId,
          error: error.message
        });
      }
    }

    // Log bulk operation completion
    await FeedbackAuditLog.createLog({
      entity: 'admin_action',
      entityId: null,
      action: 'bulk_operation_completed',
      actor: {
        id: adminId,
        role: 'admin',
        name: req.user.name
      },
      context: {
        feedbackIds,
        action,
        results
      },
      result: results.failed.length === 0 ? 'success' : 'partial',
      duration: 0
    });

    res.json({
      success: true,
      message: `Bulk ${action} operation completed`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulk moderate feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get audit trail for feedback
export const getFeedbackAuditTrail = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const auditTrail = await FeedbackAuditLog.getAuditTrail('feedback', feedbackId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const total = await FeedbackAuditLog.countDocuments({
      entity: 'feedback',
      entityId: feedbackId
    });

    res.json({
      success: true,
      data: {
        auditTrail,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting feedback audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};