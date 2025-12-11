import fetch from "node-fetch";

// Moderate user messages for safety
export async function moderateMessage(text) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.warn("OpenAI API key not configured, skipping moderation");
      return { flagged: false, categories: {} };
    }

    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Moderation API error:", data.error);
      return { flagged: false, categories: {} };
    }

    const result = data.results[0];
    return {
      flagged: result.flagged,
      categories: result.categories,
      category_scores: result.category_scores
    };
  } catch (error) {
    console.error("Error in moderation:", error);
    return { flagged: false, categories: {} };
  }
}

// Check if message contains sensitive information
export function containsSensitiveInfo(text) {
  const sensitivePatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card numbers
    /\b\d{10}\b/, // Phone numbers (basic)
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
    /\b\d{12}\b/, // Aadhaar-like numbers
    /password|pwd|passcode/i,
    /secret|token|key|api[_-]?key/i
  ];

  return sensitivePatterns.some(pattern => pattern.test(text));
}

// Sanitize user input
export function sanitizeInput(text) {
  // Remove or mask potentially harmful content
  let sanitized = text;

  // Remove script tags and HTML
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Mask email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

  // Mask phone numbers
  sanitized = sanitized.replace(/\b\d{10}\b/g, '[PHONE]');

  // Mask credit card numbers
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');

  return sanitized.trim();
}

// Rate limiting check (simple in-memory implementation)
const userMessageCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_MESSAGES_PER_WINDOW = 10;

export function checkRateLimit(userId) {
  const now = Date.now();
  const userKey = userId || 'anonymous';

  if (!userMessageCounts.has(userKey)) {
    userMessageCounts.set(userKey, []);
  }

  const timestamps = userMessageCounts.get(userKey);

  // Remove old timestamps outside the window
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  userMessageCounts.set(userKey, validTimestamps);

  if (validTimestamps.length >= MAX_MESSAGES_PER_WINDOW) {
    return { allowed: false, resetTime: RATE_LIMIT_WINDOW - (now - validTimestamps[0]) };
  }

  // Add current timestamp
  validTimestamps.push(now);
  return { allowed: true };
}

// Log user interactions for monitoring
export function logInteraction(userId, message, response, metadata = {}) {
  const logEntry = {
    timestamp: new Date(),
    userId: userId || 'anonymous',
    userMessage: message,
    botResponse: response,
    ...metadata
  };

  // In production, this would be sent to a logging service
  console.log('Chat interaction:', JSON.stringify(logEntry, null, 2));

  // Store in memory for basic analytics (in production, use a database)
  if (!global.chatLogs) {
    global.chatLogs = [];
  }
  global.chatLogs.push(logEntry);

  // Keep only last 1000 logs
  if (global.chatLogs.length > 1000) {
    global.chatLogs = global.chatLogs.slice(-1000);
  }
}

// Get basic analytics
export function getChatAnalytics() {
  if (!global.chatLogs) {
    return { totalInteractions: 0, avgResponseTime: 0, errorRate: 0 };
  }

  const logs = global.chatLogs;
  const totalInteractions = logs.length;
  const errors = logs.filter(log => log.error).length;
  const errorRate = totalInteractions > 0 ? (errors / totalInteractions) * 100 : 0;

  return {
    totalInteractions,
    errorRate: Math.round(errorRate * 100) / 100,
    recentInteractions: logs.slice(-10)
  };
}