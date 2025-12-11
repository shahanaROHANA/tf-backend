// src/models/feedbackAuditLogModel.js
import mongoose from 'mongoose';

// Audit log entry schema
const feedbackAuditLogSchema = new mongoose.Schema({
  // Log identification
  logId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'AL' + Date.now() + Math.random().toString(36).substr(2, 8).toUpperCase()
  },

  // Entity references
  entity: {
    type: String,
    required: true,
    enum: ['feedback', 'feedback_report', 'user', 'seller', 'delivery_agent', 'admin_action']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  // Action details
  action: {
    type: String,
    required: true,
    enum: [
      // Feedback actions
      'feedback_created',
      'feedback_updated',
      'feedback_deleted',
      'feedback_approved',
      'feedback_rejected',
      'feedback_flagged',
      'feedback_unflagged',
      'feedback_published',
      'feedback_unpublished',
      'feedback_replied',
      'feedback_reply_updated',
      'feedback_reply_deleted',
      'feedback_helpful_voted',
      'feedback_media_uploaded',
      'feedback_media_deleted',
      
      // Report actions
      'report_created',
      'report_assigned',
      'report_reviewed',
      'report_resolved',
      'report_dismissed',
      'report_escalated',
      'evidence_uploaded',
      
      // Admin actions
      'admin_login',
      'admin_action_performed',
      'bulk_operation_started',
      'bulk_operation_completed',
      'settings_updated',
      
      // System actions
      'auto_moderation_triggered',
      'notification_sent',
      'rate_limit_exceeded',
      'duplicate_detected'
    ]
  },

  // Actor information
  actor: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin', 'delivery_agent', 'system']
    },
    name: String,
    email: String,
    ipAddress: String,
    userAgent: String,
    sessionId: String
  },

  // Context and metadata
  context: {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    previousValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed,
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed
    }],
    metadata: mongoose.Schema.Types.Mixed
  },

  // Risk and compliance
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  complianceTags: [{
    type: String,
    enum: ['gdpr', 'data_retention', 'user_privacy', 'content_moderation', 'audit_trail']
  }],

  // Results and outcomes
  result: {
    type: String,
    enum: ['success', 'failure', 'partial', 'cancelled'],
    required: true
  },
  error: {
    code: String,
    message: String,
    stack: String
  },

  // Performance metrics
  duration: {
    type: Number, // milliseconds
    required: true
  },

  // Notification status
  notificationsSent: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push', 'socket']
    },
    recipient: String,
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending']
    },
    sentAt: Date,
    messageId: String
  }],

  // Data retention
  retentionDate: {
    type: Date,
    default: function() {
      // Keep audit logs for 3 years by default
      const date = new Date();
      date.setFullYear(date.getFullYear() + 3);
      return date;
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: false, // We use our own timestamp field
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and querying
feedbackAuditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
feedbackAuditLogSchema.index({ actor: { id: 1 }, timestamp: -1 });
feedbackAuditLogSchema.index({ action: 1, timestamp: -1 });
feedbackAuditLogSchema.index({ timestamp: -1 });
feedbackAuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
feedbackAuditLogSchema.index({ result: 1, timestamp: -1 });
feedbackAuditLogSchema.index({ retentionDate: 1 });
feedbackAuditLogSchema.index({ logId: 1 });

// TTL index for automatic deletion (after retention period)
feedbackAuditLogSchema.index(
  { retentionDate: 1 },
  { expireAfterSeconds: 0 }
);

// Virtual for action display name
feedbackAuditLogSchema.virtual('actionDisplay').get(function() {
  const actionMap = {
    'feedback_created': 'Feedback Created',
    'feedback_updated': 'Feedback Updated',
    'feedback_deleted': 'Feedback Deleted',
    'feedback_approved': 'Feedback Approved',
    'feedback_rejected': 'Feedback Rejected',
    'feedback_flagged': 'Feedback Flagged',
    'feedback_unflagged': 'Feedback Unflagged',
    'feedback_published': 'Feedback Published',
    'feedback_unpublished': 'Feedback Unpublished',
    'feedback_replied': 'Feedback Replied',
    'feedback_reply_updated': 'Reply Updated',
    'feedback_reply_deleted': 'Reply Deleted',
    'feedback_helpful_voted': 'Helpful Vote',
    'feedback_media_uploaded': 'Media Uploaded',
    'feedback_media_deleted': 'Media Deleted',
    'report_created': 'Report Created',
    'report_assigned': 'Report Assigned',
    'report_reviewed': 'Report Reviewed',
    'report_resolved': 'Report Resolved',
    'report_dismissed': 'Report Dismissed',
    'report_escalated': 'Report Escalated',
    'evidence_uploaded': 'Evidence Uploaded',
    'admin_login': 'Admin Login',
    'admin_action_performed': 'Admin Action',
    'bulk_operation_started': 'Bulk Operation Started',
    'bulk_operation_completed': 'Bulk Operation Completed',
    'settings_updated': 'Settings Updated',
    'auto_moderation_triggered': 'Auto Moderation',
    'notification_sent': 'Notification Sent',
    'rate_limit_exceeded': 'Rate Limit Exceeded',
    'duplicate_detected': 'Duplicate Detected'
  };
  return actionMap[this.action] || this.action;
});

// Static method to create audit log entry
feedbackAuditLogSchema.statics.createLog = async function(data) {
  try {
    const logEntry = new this({
      ...data,
      timestamp: new Date()
    });
    
    await logEntry.save();
    return logEntry;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking main flow
    return null;
  }
};

// Static method to get audit trail for an entity
feedbackAuditLogSchema.statics.getAuditTrail = function(entityType, entityId, options = {}) {
  const query = {
    entity: entityType,
    entityId: entityId
  };

  if (options.startDate) {
    query.timestamp = { $gte: new Date(options.startDate) };
  }

  if (options.endDate) {
    query.timestamp = Object.assign(query.timestamp || {}, { 
      $lte: new Date(options.endDate) 
    });
  }

  if (options.actions && options.actions.length > 0) {
    query.action = { $in: options.actions };
  }

  if (options.actorRole) {
    query['actor.role'] = options.actorRole;
  }

  if (options.riskLevel) {
    query.riskLevel = options.riskLevel;
  }

  return this.find(query)
    .populate('actor.id', 'name email role')
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Static method to get activity summary
feedbackAuditLogSchema.statics.getActivitySummary = function(timeRange = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeRange);

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          result: '$result'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to get admin activity report
feedbackAuditLogSchema.statics.getAdminActivityReport = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        'actor.role': 'admin'
      }
    },
    {
      $group: {
        _id: {
          actor: '$actor.id',
          actorName: '$actor.name'
        },
        actions: {
          $push: {
            action: '$action',
            timestamp: '$timestamp',
            entity: '$entity',
            result: '$result',
            duration: '$duration'
          }
        },
        totalActions: { $sum: 1 },
        successRate: {
          $avg: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
        },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { totalActions: -1 }
    }
  ]);
};

// Static method to get system health metrics
feedbackAuditLogSchema.statics.getSystemHealthMetrics = function(timeRange = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - timeRange);

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalActions: { $sum: 1 },
        successfulActions: {
          $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
        },
        failedActions: {
          $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
        },
        avgDuration: { $avg: '$duration' },
        highRiskActions: {
          $sum: { $cond: [{ $in: ['$riskLevel', ['high', 'critical']] }, 1, 0] }
        },
        autoModerationTriggers: {
          $sum: { $cond: [{ $eq: ['$action', 'auto_moderation_triggered'] }, 1, 0] }
        },
        rateLimitExceedances: {
          $sum: { $cond: [{ $eq: ['$action', 'rate_limit_exceeded'] }, 1, 0] }
        }
      }
    }
  ]);
};

export default mongoose.model('FeedbackAuditLog', feedbackAuditLogSchema);