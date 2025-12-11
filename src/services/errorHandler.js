// Comprehensive Error Handling and Fallback Service
import { syncJobManager } from './syncService.js';

/**
 * Error Handler with classification and fallback mechanisms
 */
class ErrorHandler {
  constructor() {
    this.errorTypes = {
      NETWORK: 'network',
      API: 'api',
      VALIDATION: 'validation',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      RATE_LIMIT: 'rate_limit',
      QUOTA_EXCEEDED: 'quota_exceeded',
      DATA_NOT_FOUND: 'data_not_found',
      SERVICE_UNAVAILABLE: 'service_unavailable',
      INTERNAL: 'internal',
      UNKNOWN: 'unknown'
    };

    this.fallbackStrategies = new Map();
    this.errorLog = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    
    this.initializeFallbackStrategies();
  }

  /**
   * Classify and handle errors with appropriate fallbacks
   */
  async handleError(error, context = {}) {
    const errorInfo = this.classifyError(error);
    const { type, message, status, retryable } = errorInfo;
    
    // Log error for monitoring
    this.logError(errorInfo, context);
    
    // Determine fallback strategy
    const fallbackStrategy = this.getFallbackStrategy(type, context);
    
    try {
      // Attempt fallback if available
      if (fallbackStrategy) {
        const fallbackResult = await this.executeFallback(fallbackStrategy, context);
        if (fallbackResult.success) {
          return {
            success: true,
            data: fallbackResult.data,
            fallback: true,
            originalError: errorInfo,
            fallbackReason: fallbackStrategy.reason
          };
        }
      }
      
      // If no fallback or fallback failed, attempt retry for retryable errors
      if (retryable && context.operation) {
        const retryResult = await this.attemptRetry(errorInfo, context);
        if (retryResult.success) {
          return retryResult;
        }
      }
      
      // Return formatted error response
      return {
        success: false,
        error: errorInfo,
        fallback: false,
        userMessage: this.getUserFriendlyMessage(errorInfo, context),
        recoverySuggestions: this.getRecoverySuggestions(errorInfo, context)
      };
      
    } catch (fallbackError) {
      console.error('Fallback execution failed:', fallbackError);
      return {
        success: false,
        error: {
          type: 'fallback_failed',
          message: 'Both primary operation and fallback failed',
          originalError: errorInfo,
          fallbackError: this.classifyError(fallbackError)
        },
        fallback: false,
        userMessage: 'Service temporarily unavailable. Please try again later.',
        recoverySuggestions: [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if the problem persists'
        ]
      };
    }
  }

  /**
   * Classify error based on type, status, and message patterns
   */
  classifyError(error) {
    const info = {
      type: this.errorTypes.UNKNOWN,
      message: error.message || 'Unknown error',
      status: error.status || error.code,
      retryable: false,
      severity: 'medium',
      timestamp: new Date().toISOString()
    };

    // Network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR' || !error.status) {
      info.type = this.errorTypes.NETWORK;
      info.retryable = true;
      info.severity = 'high';
      return info;
    }

    // HTTP status-based classification
    switch (error.status) {
      case 400:
        info.type = this.errorTypes.VALIDATION;
        info.message = 'Invalid request data';
        break;
      case 401:
        info.type = this.errorTypes.AUTHENTICATION;
        info.retryable = false;
        info.severity = 'high';
        break;
      case 403:
        info.type = this.errorTypes.AUTHORIZATION;
        info.retryable = false;
        info.severity = 'high';
        break;
      case 404:
        info.type = this.errorTypes.DATA_NOT_FOUND;
        info.retryable = false;
        break;
      case 429:
        info.type = this.errorTypes.RATE_LIMIT;
        info.retryable = true;
        info.severity = 'medium';
        break;
      case 500:
        info.type = this.errorTypes.INTERNAL;
        info.retryable = true;
        info.severity = 'high';
        break;
      case 503:
        info.type = this.errorTypes.SERVICE_UNAVAILABLE;
        info.retryable = true;
        info.severity = 'high';
        break;
    }

    // Message pattern-based classification
    const errorMsg = error.message?.toLowerCase() || '';
    
    if (errorMsg.includes('quota') || errorMsg.includes('limit exceeded')) {
      info.type = this.errorTypes.QUOTA_EXCEEDED;
      info.retryable = false;
      info.severity = 'high';
    } else if (errorMsg.includes('api') || errorMsg.includes('google places')) {
      info.type = this.errorTypes.API;
      info.retryable = true;
    } else if (errorMsg.includes('validation') || errorMsg.includes('invalid')) {
      info.type = this.errorTypes.VALIDATION;
      info.retryable = false;
    }

    return info;
  }

  /**
   * Initialize fallback strategies for different error types
   */
  initializeFallbackStrategies() {
    this.fallbackStrategies.set(this.errorTypes.NETWORK, [
      {
        name: 'cached_data',
        reason: 'Network unavailable, using cached data',
        execute: (context) => this.getCachedData(context)
      },
      {
        name: 'retry_later',
        reason: 'Network unstable, scheduling retry',
        execute: (context) => this.scheduleRetry(context)
      }
    ]);

    this.fallbackStrategies.set(this.errorTypes.API, [
      {
        name: 'backup_endpoint',
        reason: 'Primary API failed, using backup endpoint',
        execute: (context) => this.tryBackupEndpoint(context)
      },
      {
        name: 'cached_response',
        reason: 'Using cached API response',
        execute: (context) => this.getCachedApiResponse(context)
      }
    ]);

    this.fallbackStrategies.set(this.errorTypes.RATE_LIMIT, [
      {
        name: 'delayed_retry',
        reason: 'Rate limited, delaying retry',
        execute: (context) => this.scheduleDelayedRetry(context)
      }
    ]);

    this.fallbackStrategies.set(this.errorTypes.SERVICE_UNAVAILABLE, [
      {
        name: 'maintenance_mode',
        reason: 'Service under maintenance, using basic functionality',
        execute: (context) => this.enableMaintenanceMode(context)
      }
    ]);

    this.fallbackStrategies.set(this.errorTypes.QUOTA_EXCEEDED, [
      {
        name: 'reduced_functionality',
        reason: 'API quota exceeded, enabling reduced functionality',
        execute: (context) => this.enableReducedFunctionality(context)
      }
    ]);
  }

  /**
   * Get appropriate fallback strategy for error type
   */
  getFallbackStrategy(errorType, context) {
    const strategies = this.fallbackStrategies.get(errorType);
    if (!strategies || strategies.length === 0) return null;

    // Select strategy based on context and availability
    for (const strategy of strategies) {
      if (this.isStrategyAvailable(strategy, context)) {
        return strategy;
      }
    }

    return null;
  }

  /**
   * Check if fallback strategy is available
   */
  isStrategyAvailable(strategy, context) {
    switch (strategy.name) {
      case 'cached_data':
        return this.hasCachedData(context);
      case 'cached_response':
        return this.hasCachedApiResponse(context);
      case 'backup_endpoint':
        return this.hasBackupEndpoint(context);
      case 'maintenance_mode':
        return context.operation !== 'critical';
      default:
        return true;
    }
  }

  /**
   * Execute fallback strategy
   */
  async executeFallback(strategy, context) {
    try {
      const result = await strategy.execute(context);
      return {
        success: true,
        data: result,
        strategy: strategy.name
      };
    } catch (error) {
      console.error(`Fallback strategy ${strategy.name} failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Attempt retry with exponential backoff
   */
  async attemptRetry(errorInfo, context) {
    const operation = context.operation;
    const key = `${operation}_${JSON.stringify(context.params || {})}`;
    
    const currentAttempts = this.retryAttempts.get(key) || 0;
    
    if (currentAttempts >= this.maxRetries) {
      return {
        success: false,
        error: 'Max retry attempts exceeded',
        attempts: currentAttempts
      };
    }

    this.retryAttempts.set(key, currentAttempts + 1);

    // Calculate delay with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, currentAttempts), 30000);
    
    console.log(`Retrying ${operation} in ${delay}ms (attempt ${currentAttempts + 1}/${this.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Re-attempt the original operation
      const result = await context.retryFunction?.(context.params);
      return {
        success: true,
        data: result,
        retryAttempt: currentAttempts + 1,
        retryDelay: delay
      };
    } catch (retryError) {
      // If retry also fails, classify the retry error
      const retryErrorInfo = this.classifyError(retryError);
      return {
        success: false,
        error: retryErrorInfo,
        retryAttempt: currentAttempts + 1,
        attempts: currentAttempts + 1
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(errorInfo, context) {
    const { type, status } = errorInfo;
    
    const messages = {
      [this.errorTypes.NETWORK]: 'Connection problem. Please check your internet and try again.',
      [this.errorTypes.API]: 'Service temporarily unavailable. Please try again later.',
      [this.errorTypes.VALIDATION]: 'Please check your input and try again.',
      [this.errorTypes.AUTHENTICATION]: 'Please log in to continue.',
      [this.errorTypes.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [this.errorTypes.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
      [this.errorTypes.QUOTA_EXCEEDED]: 'Service usage limit reached. Please try again later.',
      [this.errorTypes.DATA_NOT_FOUND]: 'The requested information could not be found.',
      [this.errorTypes.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
      [this.errorTypes.INTERNAL]: 'Something went wrong on our end. Please try again.'
    };

    return messages[type] || 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get recovery suggestions for errors
   */
  getRecoverySuggestions(errorInfo, context) {
    const { type } = errorInfo;
    
    const suggestions = {
      [this.errorTypes.NETWORK]: [
        'Check your internet connection',
        'Try refreshing the page',
        'Move to a location with better signal'
      ],
      [this.errorTypes.API]: [
        'Try again in a few moments',
        'Check if the service status page shows any issues',
        'Contact support if the problem persists'
      ],
      [this.errorTypes.RATE_LIMIT]: [
        'Wait a few minutes before trying again',
        'Try again during off-peak hours',
        'Consider upgrading your plan if you\'re a heavy user'
      ],
      [this.errorTypes.QUOTA_EXCEEDED]: [
        'Wait for your quota to reset',
        'Try again tomorrow',
        'Consider upgrading your service plan'
      ],
      [this.errorTypes.AUTHENTICATION]: [
        'Log out and log back in',
        'Check if your session has expired',
        'Clear your browser cache and cookies'
      ]
    };

    return suggestions[type] || [
      'Try again in a moment',
      'Refresh the page',
      'Contact support if the problem persists'
    ];
  }

  /**
   * Log error for monitoring and analysis
   */
  logError(errorInfo, context) {
    const logEntry = {
      ...errorInfo,
      context: {
        operation: context.operation,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    };

    this.errorLog.push(logEntry);
    
    // Keep only last 1000 errors to prevent memory issues
    if (this.errorLog.length > 1000) {
      this.errorLog = this.errorLog.slice(-1000);
    }

    // In production, you would send this to a logging service
    console.error('Error logged:', logEntry);
  }

  // Fallback strategy implementations
  async getCachedData(context) {
    // Implementation would depend on your caching strategy
    const cached = localStorage.getItem(`cache_${context.operation}`);
    return cached ? JSON.parse(cached) : null;
  }

  hasCachedData(context) {
    return localStorage.getItem(`cache_${context.operation}`) !== null;
  }

  async tryBackupEndpoint(context) {
    // Try alternative endpoints or services
    const backupUrl = this.getBackupUrl(context.operation);
    if (backupUrl) {
      const response = await fetch(backupUrl, context.options);
      return await response.json();
    }
    throw new Error('No backup endpoint available');
  }

  getBackupUrl(operation) {
    const backupUrls = {
      'stations_search': '/api/fallback/stations',
      'restaurants_search': '/api/fallback/restaurants',
      'place_details': '/api/fallback/place-details'
    };
    return backupUrls[operation];
  }

  hasBackupEndpoint(context) {
    return this.getBackupUrl(context.operation) !== null;
  }

  async getCachedApiResponse(context) {
    const cacheKey = `api_${context.operation}_${JSON.stringify(context.params)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Check if cache is still valid (within 1 hour)
      if (Date.now() - timestamp < 3600000) {
        return data;
      }
    }
    throw new Error('No valid cached response available');
  }

  hasCachedApiResponse(context) {
    const cacheKey = `api_${context.operation}_${JSON.stringify(context.params)}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return false;
    
    try {
      const { timestamp } = JSON.parse(cached);
      return Date.now() - timestamp < 3600000; // 1 hour cache
    } catch {
      return false;
    }
  }

  async scheduleRetry(context) {
    // Schedule retry for when network is restored
    setTimeout(() => {
      context.retryFunction?.(context.params);
    }, 5000);
    
    return { scheduled: true, retryIn: 5000 };
  }

  async scheduleDelayedRetry(context) {
    // Longer delay for rate limit errors
    const delay = 60000; // 1 minute
    setTimeout(() => {
      context.retryFunction?.(context.params);
    }, delay);
    
    return { scheduled: true, retryIn: delay };
  }

  async enableMaintenanceMode(context) {
    return {
      mode: 'maintenance',
      message: 'Service is under maintenance. Basic functionality is available.',
      features: ['basic_search', 'cached_data']
    };
  }

  async enableReducedFunctionality(context) {
    return {
      mode: 'reduced',
      message: 'Running in reduced functionality mode due to quota limits.',
      available_features: ['basic_search', 'cached_data', 'limited_recommendations']
    };
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics() {
    const stats = {
      total_errors: this.errorLog.length,
      error_types: {},
      recent_errors: this.errorLog.slice(-10),
      retry_attempts: Array.from(this.retryAttempts.entries()),
      timestamp: new Date().toISOString()
    };

    // Count errors by type
    this.errorLog.forEach(error => {
      stats.error_types[error.type] = (stats.error_types[error.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear error logs and retry attempts
   */
  clearErrorLogs() {
    this.errorLog = [];
    this.retryAttempts.clear();
  }
}

/**
 * Global error boundary for React components
 */
class ErrorBoundary {
  constructor() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
  }

  componentDidCatch(error, errorInfo) {
    this.hasError = true;
    this.error = error;
    this.errorInfo = errorInfo;
    
    // Log to error handler
    const errorHandler = new ErrorHandler();
    errorHandler.handleError(error, {
      operation: 'react_component_error',
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
            <details>
              <summary>Error Details</summary>
              <pre>{this.error?.toString()}</pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Initialize global error handling
 */
export function initializeGlobalErrorHandling() {
  const errorHandler = new ErrorHandler();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    errorHandler.handleError(event.reason, {
      operation: 'unhandled_promise_rejection'
    });
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    errorHandler.handleError(event.error, {
      operation: 'global_javascript_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  return errorHandler;
}

// Export services
export { ErrorHandler, ErrorBoundary };
export default ErrorHandler;