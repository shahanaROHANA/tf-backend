// src/models/feedbackModel.js
import mongoose from 'mongoose';

// Feedback media schema for photos/videos
const mediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  }
}, { _id: false });

// Main feedback schema
const feedbackSchema = new mongoose.Schema({
  // Feedback identification
  feedbackId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'FB' + Date.now() + Math.random().toString(36).substr(2, 8).toUpperCase()
  },
  
  // Related entities
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  deliveryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Delivery agents are also users
  },

  // Feedback content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  summary: {
    type: String,
    maxlength: 200,
    trim: true
  },
  detailedComment: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },

  // Target and categorization
  target: {
    type: String,
    required: true,
    enum: ['seller', 'delivery_agent', 'platform', 'general']
  },
  tags: [{
    type: String,
    enum: [
      'food_quality', 'delivery_speed', 'packaging', 'customer_service',
      'price_value', 'accuracy', 'cleanliness', 'friendliness',
      'navigation', 'app_experience', 'payment_issues', 'other'
    ]
  }],

  // Media attachments
  media: [mediaSchema],

  // Privacy and anonymity
  isAnonymous: {
    type: Boolean,
    default: false
  },

  // Moderation status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged', 'under_review'],
    default: 'pending'
  },
  
  // Moderation details
  moderationHistory: [{
    action: {
      type: String,
      enum: ['approved', 'rejected', 'edited', 'flagged', 'unflagged']
    },
    reason: String,
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date,
      default: Date.now
    },
    previousStatus: String,
    notes: String
  }],

  // Public visibility
  isPublic: {
    type: Boolean,
    default: true
  },

  // Engagement metrics
  helpfulVotes: {
    count: {
      type: Number,
      default: 0
    },
    voters: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Reply system (for seller/admin responses)
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    authorRole: {
      type: String,
      enum: ['seller', 'admin', 'delivery_agent'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    editedAt: Date,
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],

  // Anti-abuse tracking
  duplicateCheck: {
    contentHash: String, // Hash of content to detect duplicates
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feedback'
    }
  },

  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: Date, // When it became publicly visible
  lastActivity: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
feedbackSchema.index({ order: 1 });
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ seller: 1, createdAt: -1 });
feedbackSchema.index({ deliveryAgent: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ target: 1, status: 1 });
feedbackSchema.index({ rating: 1, status: 1 });
feedbackSchema.index({ tags: 1 });
feedbackSchema.index({ 'helpfulVotes.count': -1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ feedbackId: 1 });

// Virtual for average rating calculation
feedbackSchema.virtual('averageRating').get(function() {
  // This would typically be calculated from aggregated data
  return this.rating;
});

// Virtual for human-readable target
feedbackSchema.virtual('targetDisplay').get(function() {
  const targetMap = {
    'seller': 'Restaurant/Seller',
    'delivery_agent': 'Delivery Agent',
    'platform': 'Platform',
    'general': 'General'
  };
  return targetMap[this.target] || this.target;
});

// Virtual for status display
feedbackSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'flagged': 'Flagged',
    'under_review': 'Under Review'
  };
  return statusMap[this.status] || this.status;
});

// Pre-save middleware to update last activity
feedbackSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  next();
});

// Static method to get average ratings
feedbackSchema.statics.getAverageRating = async function(targetType, targetId) {
  const pipeline = [
    {
      $match: {
        status: 'approved',
        [targetType]: mongoose.Types.ObjectId(targetId),
        isPublic: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingDistribution.forEach(rating => {
    distribution[rating] = (distribution[rating] || 0) + 1;
  });

  return {
    averageRating: Math.round(data.averageRating * 10) / 10,
    totalReviews: data.totalReviews,
    ratingDistribution: distribution
  };
};

// Static method to get recent feedback
feedbackSchema.statics.getRecentFeedback = function(targetType, targetId, limit = 10) {
  return this.find({
    status: 'approved',
    [targetType]: targetId,
    isPublic: true
  })
  .populate('user', 'name')
  .populate('replies.author', 'name role')
  .sort({ publishedAt: -1 })
  .limit(limit);
};

export default mongoose.model('Feedback', feedbackSchema);