// src/services/feedbackAntiAbuseService.js
import crypto from 'crypto';
import Feedback from '../models/feedbackModel.js';
import FeedbackAuditLog from '../models/feedbackAuditLogModel.js';

// Profanity filter - basic word list (in production, use a comprehensive library)
const profanityList = [
  'badword1', 'badword2', 'offensiveword1', 'offensiveword2',
  'harassment1', 'harassment2', 'hatespeech1', 'hatespeech2'
];

// Rate limiting configuration
const RATE_LIMITS = {
  feedback_creation: { window: 3600000, max: 3 }, // 3 feedback per hour
  feedback_report: { window: 3600000, max: 5 }, // 5 reports per hour
  user_reports: { window: 86400000, max: 10 } // 10 reports per day
};

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

class FeedbackAntiAbuseService {
  /**
   * Generate content hash for duplicate detection
   */
  generateContentHash(content, userId, targetType, targetId) {
    const data = `${content.toLowerCase().trim()}|${userId}|${targetType}|${targetId}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check for profanity in text content
   */
  checkProfanity(text) {
    if (!text) return { isClean: true, violations: [], score: 0 };

    const lowercaseText = text.toLowerCase();
    const violations = [];
    let score = 0;

    profanityList.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowercaseText.match(regex);
      
      if (matches) {
        violations.push({
          word,
          matches: matches.length,
          severity: 'medium'
        });
        score += matches.length * 0.3;
      }
    });

    return {
      isClean: violations.length === 0,
      violations,
      score: Math.min(score, 1.0) // Cap at 1.0
    };
  }

  /**
   * Check for duplicate content
   */
  async checkDuplicates(content, userId, targetType, targetId) {
    const contentHash = this.generateContentHash(content, userId, targetType, targetId);
    
    // Check for exact matches in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const duplicate = await Feedback.findOne({
      'duplicateCheck.contentHash': contentHash,
      createdAt: { $gte: thirtyDaysAgo },
      status: { $in: ['pending', 'approved'] }
    });

    return {
      isDuplicate: !!duplicate,
      duplicateFeedback: duplicate,
      contentHash
    };
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(userId, action) {
    const config = RATE_LIMITS[action];
    if (!config) return { allowed: true, remaining: Infinity };

    const key = `${userId}_${action}`;
    const now = Date.now();
    const windowStart = now - config.window;

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimitStore.set(key, validRequests);

    if (validRequests.length >= config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + config.window,
        message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.window / 3600000} hours.`
      };
    }

    // Add current request
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    return {
      allowed: true,
      remaining: config.max - validRequests.length,
      resetTime: now + config.window
    };
  }

  /**
   * Comprehensive content analysis
   */
  async analyzeContent(content, userId, targetType, targetId, metadata = {}) {
    const startTime = Date.now();
    const results = {
      profanity: this.checkProfanity(content),
      duplicates: await this.checkDuplicates(content, userId, targetType, targetId),
      rateLimit: this.checkRateLimit(userId, 'feedback_creation'),
      riskScore: 0,
      recommendations: []
    };

    // Calculate risk score
    let riskScore = 0;
    
    // Profanity risk
    if (!results.profanity.isClean) {
      riskScore += results.profanity.score * 0.4;
      results.recommendations.push('Review for inappropriate language');
    }

    // Duplicate risk
    if (results.duplicates.isDuplicate) {
      riskScore += 0.6;
      results.recommendations.push('Potential duplicate content detected');
    }

    // Rate limit risk
    if (!results.rateLimit.allowed) {
      riskScore += 0.8;
      results.recommendations.push('Rate limit exceeded');
    }

    results.riskScore = Math.min(riskScore, 1.0);

    // Determine recommendation
    if (results.riskScore > 0.7) {
      results.recommendation = 'reject';
    } else if (results.riskScore > 0.4) {
      results.recommendation = 'review';
    } else {
      results.recommendation = 'approve';
    }

    // Log the analysis
    const duration = Date.now() - startTime;
    await FeedbackAuditLog.createLog({
      entity: 'feedback',
      entityId: null, // Will be set after feedback creation
      action: 'auto_moderation_triggered',
      actor: { id: userId, role: 'customer' },
      context: {
        metadata: {
          contentLength: content?.length || 0,
          targetType,
          targetId,
          ...metadata
        }
      },
      result: 'success',
      duration
    });

    return results;
  }

  /**
   * Analyze media files for inappropriate content
   */
  analyzeMedia(mediaFiles) {
    const results = {
      issues: [],
      score: 0
    };

    if (!mediaFiles || mediaFiles.length === 0) {
      return results;
    }

    mediaFiles.forEach((file, index) => {
      const issues = [];

      // File size check (max 5MB per file)
      if (file.size > 5 * 1024 * 1024) {
        issues.push({
          type: 'file_size',
          message: 'File too large',
          severity: 'medium'
        });
      }

      // File type validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
      if (!allowedTypes.includes(file.mimeType)) {
        issues.push({
          type: 'file_type',
          message: 'Invalid file type',
          severity: 'high'
        });
      }

      // Suspicious patterns in filename
      const suspiciousPatterns = ['spam', 'promo', 'advertisement'];
      const filename = file.originalname?.toLowerCase() || '';
      if (suspiciousPatterns.some(pattern => filename.includes(pattern))) {
        issues.push({
          type: 'suspicious_filename',
          message: 'Suspicious filename detected',
          severity: 'low'
        });
      }

      results.issues.push({
        fileIndex: index,
        filename: file.originalname,
        issues
      });

      // Calculate media score
      issues.forEach(issue => {
        const severityWeight = {
          'low': 0.1,
          'medium': 0.3,
          'high': 0.6
        };
        results.score += severityWeight[issue.severity] || 0.1;
      });
    });

    results.score = Math.min(results.score, 1.0);
    return results;
  }

  /**
   * Check user reputation and history
   */
  async checkUserReputation(userId) {
    try {
      // Get user's feedback history
      const userFeedback = await Feedback.find({ user: userId });
      
      const totalFeedback = userFeedback.length;
      const approvedFeedback = userFeedback.filter(f => f.status === 'approved').length;
      const rejectedFeedback = userFeedback.filter(f => f.status === 'rejected').length;
      const flaggedFeedback = userFeedback.filter(f => f.status === 'flagged').length;

      // Calculate reputation score (0-1)
      let reputationScore = 1.0;
      
      // Deduct points for rejected feedback
      if (totalFeedback > 0) {
        const rejectionRate = rejectedFeedback / totalFeedback;
        reputationScore -= rejectionRate * 0.5;
      }

      // Deduct points for flagged feedback
      if (totalFeedback > 0) {
        const flagRate = flaggedFeedback / totalFeedback;
        reputationScore -= flagRate * 0.7;
      }

      // New users start with neutral reputation
      if (totalFeedback === 0) {
        reputationScore = 0.8;
      }

      // Boost reputation for consistent good feedback
      if (approvedFeedback >= 5 && rejectionRate === 0) {
        reputationScore = Math.min(reputationScore + 0.2, 1.0);
      }

      return {
        score: Math.max(reputationScore, 0),
        totalFeedback,
        approvedFeedback,
        rejectedFeedback,
        flaggedFeedback,
        rejectionRate: totalFeedback > 0 ? rejectionRate : 0,
        flagRate: totalFeedback > 0 ? flagRate : 0,
        riskLevel: reputationScore > 0.8 ? 'low' : 
                  reputationScore > 0.5 ? 'medium' : 'high'
      };
    } catch (error) {
      console.error('Error checking user reputation:', error);
      return {
        score: 0.5, // Default neutral score
        totalFeedback: 0,
        approvedFeedback: 0,
        rejectedFeedback: 0,
        flaggedFeedback: 0,
        rejectionRate: 0,
        flagRate: 0,
        riskLevel: 'medium'
      };
    }
  }

  /**
   * Get rate limiting status for user
   */
  getRateLimitStatus(userId) {
    const status = {};
    
    Object.keys(RATE_LIMITS).forEach(action => {
      const key = `${userId}_${action}`;
      const config = RATE_LIMITS[action];
      const now = Date.now();
      const windowStart = now - config.window;

      const requests = rateLimitStore.get(key) || [];
      const validRequests = requests.filter(timestamp => timestamp > windowStart);

      status[action] = {
        remaining: Math.max(0, config.max - validRequests.length),
        total: config.max,
        resetTime: Math.min(...validRequests, now) + config.window,
        windowMs: config.window
      };
    });

    return status;
  }

  /**
   * Clear rate limit for user (admin function)
   */
  clearUserRateLimit(userId, action = null) {
    if (action) {
      const key = `${userId}_${action}`;
      rateLimitStore.delete(key);
    } else {
      // Clear all rate limits for user
      const keysToDelete = [];
      rateLimitStore.forEach((value, key) => {
        if (key.startsWith(`${userId}_`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => rateLimitStore.delete(key));
    }
  }

  /**
   * Get anti-abuse statistics
   */
  async getStatistics(timeRange = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - timeRange);

    const logs = await FeedbackAuditLog.find({
      action: 'auto_moderation_triggered',
      timestamp: { $gte: startDate }
    });

    const stats = {
      totalChecks: logs.length,
      flaggedContent: 0,
      rejectedContent: 0,
      averageRiskScore: 0,
      profanityDetections: 0,
      duplicateDetections: 0,
      rateLimitViolations: 0
    };

    if (logs.length === 0) return stats;

    let totalRiskScore = 0;
    let riskScoreCount = 0;

    logs.forEach(log => {
      const metadata = log.context?.metadata || {};
      
      totalRiskScore += metadata.riskScore || 0;
      riskScoreCount++;

      if (metadata.riskScore > 0.4) {
        stats.flaggedContent++;
      }
      if (metadata.riskScore > 0.7) {
        stats.rejectedContent++;
      }
      if (metadata.profanityDetected) {
        stats.profanityDetections++;
      }
      if (metadata.duplicateDetected) {
        stats.duplicateDetections++;
      }
      if (metadata.rateLimitViolated) {
        stats.rateLimitViolations++;
      }
    });

    stats.averageRiskScore = riskScoreCount > 0 ? 
      Math.round((totalRiskScore / riskScoreCount) * 100) / 100 : 0;

    return stats;
  }
}

export default new FeedbackAntiAbuseService();