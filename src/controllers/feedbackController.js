// src/controllers/feedbackController.js
import Feedback from '../models/feedbackModel.js';
import FeedbackReport from '../models/feedbackReportModel.js';
import FeedbackAuditLog from '../models/feedbackAuditLogModel.js';
import feedbackAntiAbuseService from '../services/feedbackAntiAbuseService.js';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

// Create new feedback
export const createFeedback = async (req, res) => {
  try {
    const startTime = Date.now();
    const { 
      orderId, 
      rating, 
      summary, 
      detailedComment, 
      target, 
      tags = [], 
      media = [],
      isAnonymous = false 
    } = req.body;
    
    const userId = req.user.id;
    const userIp = req.ip || req.connection.remoteAddress;

    // Validate required fields
    if (!orderId || !rating || !detailedComment || !target) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: orderId, rating, detailedComment, target'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if order exists and belongs to user
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    }).populate('seller');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or does not belong to user'
      });
    }

    // Check if order is delivered (only delivered orders can be reviewed)
    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Can only provide feedback for delivered orders'
      });
    }

    // Check if user already provided feedback for this order
    const existingFeedback = await Feedback.findOne({ 
      order: orderId, 
      user: userId 
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already provided for this order'
      });
    }

    // Run anti-abuse analysis
    const analysisResults = await feedbackAntiAbuseService.analyzeContent(
      detailedComment + ' ' + (summary || ''),
      userId,
      target,
      target === 'seller' ? order.seller._id : 
      target === 'delivery_agent' ? order.assignedDriver : null,
      { orderId, rating }
    );

    // Analyze media if present
    const mediaAnalysis = feedbackAntiAbuseService.analyzeMedia(media);

    // Determine initial status based on analysis
    let initialStatus = 'pending';
    if (analysisResults.recommendation === 'reject') {
      return res.status(400).json({
        success: false,
        message: 'Content violates community guidelines',
        analysisResults
      });
    } else if (analysisResults.recommendation === 'review') {
      initialStatus = 'pending';
    }

    // Create feedback
    const feedback = new Feedback({
      order: orderId,
      user: userId,
      seller: order.seller._id,
      deliveryAgent: order.assignedDriver,
      rating,
      summary: summary?.trim(),
      detailedComment: detailedComment.trim(),
      target,
      tags,
      media,
      isAnonymous,
      status: initialStatus,
      duplicateCheck: {
        contentHash: analysisResults.duplicates.contentHash
      }
    });

    await feedback.save();

    // Log the creation
    await FeedbackAuditLog.createLog({
      entity: 'feedback',
      entityId: feedback._id,
      action: 'feedback_created',
      actor: {
        id: userId,
        role: req.user.role,
        name: req.user.name,
        ipAddress: userIp
      },
      context: {
        orderId,
        previousValues: null,
        newValues: { rating, target, status: initialStatus }
      },
      result: 'success',
      duration: Date.now() - startTime
    });

    // If auto-moderation triggered, notify admins
    if (analysisResults.recommendation === 'review') {
      // This would trigger notification to admin queue
      // Implementation depends on your notification system
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: feedback.feedbackId,
        status: feedback.status,
        analysisResults,
        mediaAnalysis
      }
    });

  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedback with filtering and pagination
export const getFeedback = async (req, res) => {
  try {
    const { 
      targetType, 
      targetId, 
      status = 'approved',
      rating, 
      tags, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    
    if (targetType && targetId) {
      const fieldName = targetType === 'seller' ? 'seller' : 
                       targetType === 'delivery_agent' ? 'deliveryAgent' : null;
      if (fieldName) {
        query[fieldName] = targetId;
      }
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (rating) {
      query.rating = parseInt(rating);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray };
    }

    // Only show public feedback for non-admin users
    if (req.user?.role !== 'admin') {
      query.isPublic = true;
      query.status = 'approved';
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const feedback = await Feedback.find(query)
      .populate('user', 'name')
      .populate('replies.author', 'name role')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    // Get aggregate statistics if requested
    let statistics = null;
    if (targetType && targetId) {
      const fieldName = targetType === 'seller' ? 'seller' : 
                       targetType === 'delivery_agent' ? 'deliveryAgent' : null;
      if (fieldName) {
        statistics = await Feedback.getAverageRating(fieldName, targetId);
      }
    }

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        statistics
      }
    });

  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get feedback statistics
export const getFeedbackStatistics = async (req, res) => {
  try {
    const { targetType, targetId, timeRange = 30 } = req.query;

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        message: 'targetType and targetId are required'
      });
    }

    const fieldName = targetType === 'seller' ? 'seller' : 
                     targetType === 'delivery_agent' ? 'deliveryAgent' : null;

    if (!fieldName) {
      return res.status(400).json({
        success: false,
        message: 'Invalid targetType'
      });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Get average rating and distribution
    const averageStats = await Feedback.getAverageRating(fieldName, targetId);

    // Get recent feedback trends
    const trendsPipeline = [
      {
        $match: {
          [fieldName]: mongoose.Types.ObjectId(targetId),
          status: 'approved',
          isPublic: true,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ];

    const trends = await Feedback.aggregate(trendsPipeline);

    // Get tag distribution
    const tagPipeline = [
      {
        $match: {
          [fieldName]: mongoose.Types.ObjectId(targetId),
          status: 'approved',
          isPublic: true,
          tags: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$tags'
      },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const tagStats = await Feedback.aggregate(tagPipeline);

    res.json({
      success: true,
      data: {
        averageRating: averageStats.averageRating,
        totalReviews: averageStats.totalReviews,
        ratingDistribution: averageStats.ratingDistribution,
        trends,
        popularTags: tagStats.slice(0, 10),
        timeRange: parseInt(timeRange)
      }
    });

  } catch (error) {
    console.error('Error getting feedback statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Report feedback
export const reportFeedback = async (req, res) => {
  try {
    const startTime = Date.now();
    const { feedbackId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;
    const userIp = req.ip || req.connection.remoteAddress;

    // Validate required fields
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required'
      });
    }

    // Check if feedback exists
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user already reported this feedback
    const existingReport = await FeedbackReport.findOne({
      feedback: feedbackId,
      reporter: userId
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'Feedback already reported by this user'
      });
    }

    // Check rate limit
    const rateLimitCheck = feedbackAntiAbuseService.checkRateLimit(userId, 'feedback_report');
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        resetTime: rateLimitCheck.resetTime
      });
    }

    // Create report
    const report = new FeedbackReport({
      feedback: feedbackId,
      reporter: userId,
      reason,
      description: description?.trim(),
      status: 'pending'
    });

    await report.save();

    // Update feedback status to flagged
    await Feedback.findByIdAndUpdate(feedbackId, {
      status: 'flagged',
      $push: {
        moderationHistory: {
          action: 'flagged',
          reason: `User reported: ${reason}`,
          moderatedAt: new Date()
        }
      }
    });

    // Log the report
    await FeedbackAuditLog.createLog({
      entity: 'feedback_report',
      entityId: report._id,
      action: 'report_created',
      actor: {
        id: userId,
        role: req.user.role,
        name: req.user.name,
        ipAddress: userIp
      },
      context: {
        feedbackId,
        reason,
        descriptionLength: description?.length || 0
      },
      result: 'success',
      duration: Date.now() - startTime
    });

    res.status(201).json({
      success: true,
      message: 'Feedback reported successfully',
      data: {
        reportId: report.reportId,
        status: report.status
      }
    });

  } catch (error) {
    console.error('Error reporting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Mark feedback as helpful
export const markFeedbackHelpful = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const userId = req.user.id;

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user already voted
    const existingVote = feedback.helpfulVotes.voters.find(
      voter => voter.user.toString() === userId
    );

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'Already marked as helpful'
      });
    }

    // Add vote
    feedback.helpfulVotes.voters.push({
      user: userId,
      votedAt: new Date()
    });
    feedback.helpfulVotes.count = feedback.helpfulVotes.voters.length;

    await feedback.save();

    res.json({
      success: true,
      message: 'Marked as helpful',
      data: {
        helpfulCount: feedback.helpfulVotes.count
      }
    });

  } catch (error) {
    console.error('Error marking feedback helpful:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's feedback history
export const getUserFeedback = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const feedback = await Feedback.find({ user: userId })
      .populate('seller', 'name restaurantName')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments({ user: userId });

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
    console.error('Error getting user feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single feedback by ID
export const getFeedbackById = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId)
      .populate('user', 'name')
      .populate('seller', 'name restaurantName')
      .populate('deliveryAgent', 'name')
      .populate('replies.author', 'name role')
      .populate('order', 'orderNumber');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if user can view this feedback
    const canView = req.user.role === 'admin' || 
                   (feedback.isPublic && feedback.status === 'approved') ||
                   feedback.user.toString() === req.user.id;

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { feedback }
    });

  } catch (error) {
    console.error('Error getting feedback by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};