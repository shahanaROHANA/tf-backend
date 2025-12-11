// src/models/feedbackReportModel.js
import mongoose from 'mongoose';

// Feedback report schema
const feedbackReportSchema = new mongoose.Schema({
  // Report identification
  reportId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'FR' + Date.now() + Math.random().toString(36).substr(2, 8).toUpperCase()
  },

  // Related feedback
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    required: true
  },

  // Reporter information
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Report details
  reason: {
    type: String,
    required: true,
    enum: [
      'inappropriate_language', // Profanity, hate speech, harassment
      'fake_review', // Fake or fraudulent review
      'spam', // Repetitive or promotional content
      'personal_attack', // Attack on individuals
      'false_information', // Misleading or false claims
      'duplicate_content', // Same review posted multiple times
      'conflict_of_interest', // Reviewer has business relationship
      'offensive_content', // Offensive images or content
      'privacy_violation', // Reveals personal information
      'other' // Other reason not listed
    ]
  },

  // Additional details
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },

  // Report status
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed', 'escalated'],
    default: 'pending'
  },

  // Resolution details
  resolution: {
    action: {
      type: String,
      enum: [
        'feedback_removed', // Feedback removed completely
        'feedback_edited', // Feedback content edited
        'feedback_hidden', // Feedback hidden from public view
        'warning_issued', // Warning issued to reviewer
        'account_suspended', // Reviewer account suspended
        'no_action_needed', // Report was invalid
        'requires_escalation' // Needs higher-level review
      ]
    },
    reason: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date,
    notes: String
  },

  // Admin processing history
  processingHistory: [{
    action: {
      type: String,
      enum: ['assigned', 'reviewed', 'escalated', 'resolved', 'dismissed']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: String,
    previousStatus: String,
    newStatus: String
  }],

  // Priority and urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // Category classification
  category: {
    type: String,
    enum: ['content', 'spam', 'harassment', 'fraud', 'technical'],
    default: 'content'
  },

  // Evidence and context
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'transcript', 'metadata', 'external_link']
    },
    description: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Auto-moderation results
  autoModeration: {
    triggered: {
      type: Boolean,
      default: false
    },
    rules: [{
      ruleName: String,
      triggered: Boolean,
      confidence: Number, // 0-1 confidence score
      action: String
    }],
    finalScore: Number, // Overall risk score 0-1
    recommendation: {
      type: String,
      enum: ['approve', 'review', 'reject']
    }
  },

  // Reporter feedback on resolution
  reporterFeedback: {
    satisfied: {
      type: Boolean
    },
    comments: String,
    submittedAt: Date
  },

  // Escalation information
  escalation: {
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedAt: Date,
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },

  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  resolvedAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
feedbackReportSchema.index({ feedback: 1 });
feedbackReportSchema.index({ reporter: 1, createdAt: -1 });
feedbackReportSchema.index({ status: 1, createdAt: -1 });
feedbackReportSchema.index({ reason: 1, status: 1 });
feedbackReportSchema.index({ priority: 1, status: 1 });
feedbackReportSchema.index({ category: 1, status: 1 });
feedbackReportSchema.index({ assignedTo: 1, status: 1 });
feedbackReportSchema.index({ 'autoModeration.finalScore': -1 });
feedbackReportSchema.index({ submittedAt: -1 });
feedbackReportSchema.index({ reportId: 1 });

// Virtual for report status display
feedbackReportSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending Review',
    'reviewing': 'Under Review',
    'resolved': 'Resolved',
    'dismissed': 'Dismissed',
    'escalated': 'Escalated'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for reason display
feedbackReportSchema.virtual('reasonDisplay').get(function() {
  const reasonMap = {
    'inappropriate_language': 'Inappropriate Language',
    'fake_review': 'Fake Review',
    'spam': 'Spam Content',
    'personal_attack': 'Personal Attack',
    'false_information': 'False Information',
    'duplicate_content': 'Duplicate Content',
    'conflict_of_interest': 'Conflict of Interest',
    'offensive_content': 'Offensive Content',
    'privacy_violation': 'Privacy Violation',
    'other': 'Other'
  };
  return reasonMap[this.reason] || this.reason;
});

// Virtual for resolution action display
feedbackReportSchema.virtual('resolutionActionDisplay').get(function() {
  if (!this.resolution || !this.resolution.action) return '';
  
  const actionMap = {
    'feedback_removed': 'Feedback Removed',
    'feedback_edited': 'Feedback Edited',
    'feedback_hidden': 'Feedback Hidden',
    'warning_issued': 'Warning Issued',
    'account_suspended': 'Account Suspended',
    'no_action_needed': 'No Action Required',
    'requires_escalation': 'Escalation Required'
  };
  return actionMap[this.resolution.action] || this.resolution.action;
});

// Pre-save middleware to update last activity
feedbackReportSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  
  // Auto-assign priority based on reason
  if (this.isNew && this.reason) {
    const highPriorityReasons = ['fake_review', 'harassment', 'privacy_violation'];
    const mediumPriorityReasons = ['inappropriate_language', 'spam', 'personal_attack'];
    
    if (highPriorityReasons.includes(this.reason)) {
      this.priority = 'high';
    } else if (mediumPriorityReasons.includes(this.reason)) {
      this.priority = 'medium';
    } else {
      this.priority = 'low';
    }
  }
  
  next();
});

// Static method to get reports statistics
feedbackReportSchema.statics.getStatistics = async function(timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);

  const pipeline = [
    {
      $match: {
        submittedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalReports: { $sum: 1 },
        pendingReports: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolvedReports: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        dismissedReports: {
          $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
        },
        averageResolutionTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'resolved'] },
              { $divide: [{ $subtract: ['$resolvedAt', '$submittedAt'] }, 1000 * 60 * 60] }, // Hours
              null
            ]
          }
        },
        reasonBreakdown: {
          $push: '$reason'
        },
        priorityBreakdown: {
          $push: '$priority'
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      totalReports: 0,
      pendingReports: 0,
      resolvedReports: 0,
      dismissedReports: 0,
      averageResolutionTime: 0,
      reasonBreakdown: {},
      priorityBreakdown: {},
      timeRange
    };
  }

  const data = result[0];
  
  // Count reason occurrences
  const reasonBreakdown = {};
  data.reasonBreakdown.forEach(reason => {
    reasonBreakdown[reason] = (reasonBreakdown[reason] || 0) + 1;
  });

  // Count priority occurrences
  const priorityBreakdown = {};
  data.priorityBreakdown.forEach(priority => {
    priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
  });

  return {
    totalReports: data.totalReports,
    pendingReports: data.pendingReports,
    resolvedReports: data.resolvedReports,
    dismissedReports: data.dismissedReports,
    averageResolutionTime: Math.round(data.averageResolutionTime * 10) / 10,
    reasonBreakdown,
    priorityBreakdown,
    timeRange
  };
};

// Static method to get reports queue
feedbackReportSchema.statics.getQueue = function(filters = {}) {
  let query = { status: { $in: ['pending', 'reviewing'] } };
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.reason) {
    query.reason = filters.reason;
  }
  
  if (filters.category) {
    query.category = filters.category;
  }

  return this.find(query)
    .populate('feedback', 'rating detailedComment feedbackId')
    .populate('reporter', 'name email')
    .sort({ priority: -1, submittedAt: 1 })
    .limit(filters.limit || 50);
};

export default mongoose.model('FeedbackReport', feedbackReportSchema);