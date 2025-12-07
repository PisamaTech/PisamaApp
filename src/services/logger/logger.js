/**
 * Centralized logging service for PisamaApp
 * Provides structured logging with levels, context, and external service integration
 */

import { isOperationalError } from '@/errors/AppError';

// Log levels
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

// Environment
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

class Logger {
  constructor() {
    this.context = {};
    this.externalLogger = null; // Could be Sentry, LogRocket, etc.
  }

  /**
   * Set global context that will be included in all logs
   * @param {object} context - Context object (userId, sessionId, etc.)
   */
  setContext(context) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Initialize external logging service (Sentry, LogRocket, etc.)
   * @param {object} service - External logging service instance
   */
  initializeExternalLogger(service) {
    this.externalLogger = service;
  }

  /**
   * Format log entry
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} data - Additional data
   * @returns {object} Formatted log entry
   */
  _formatLogEntry(level, message, data = {}) {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      ...data,
    };
  }

  /**
   * Log to console (development only)
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  _logToConsole(level, message, data) {
    if (!isDevelopment) return;

    const logEntry = this._formatLogEntry(level, message, data);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug('🔍', message, logEntry);
        break;
      case LogLevel.INFO:
        console.info('ℹ️', message, logEntry);
        break;
      case LogLevel.WARN:
        console.warn('⚠️', message, logEntry);
        break;
      case LogLevel.ERROR:
        console.error('❌', message, logEntry);
        break;
      default:
        console.log(message, logEntry);
    }
  }

  /**
   * Log to external service (production)
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  _logToExternalService(level, message, data) {
    if (!this.externalLogger) return;

    const logEntry = this._formatLogEntry(level, message, data);

    // Example integration (adapt based on your chosen service)
    try {
      if (level === LogLevel.ERROR && data.error) {
        // Send errors to error tracking service
        this.externalLogger.captureException?.(data.error, {
          level,
          extra: logEntry,
        });
      } else {
        // Send other logs as breadcrumbs or messages
        this.externalLogger.captureMessage?.(message, {
          level,
          extra: logEntry,
        });
      }
    } catch (err) {
      // Fallback to console if external logging fails
      console.error('Failed to log to external service:', err);
    }
  }

  /**
   * Main logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  _log(level, message, data = {}) {
    this._logToConsole(level, message, data);

    if (isProduction) {
      this._logToExternalService(level, message, data);
    }
  }

  /**
   * Debug level logging
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  debug(message, data = {}) {
    this._log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info level logging
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  info(message, data = {}) {
    this._log(LogLevel.INFO, message, data);
  }

  /**
   * Warning level logging
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  warn(message, data = {}) {
    this._log(LogLevel.WARN, message, data);
  }

  /**
   * Error level logging
   * @param {string} message - Log message
   * @param {Error|object} errorOrData - Error object or additional data
   * @param {object} additionalData - Additional data if first param is Error
   */
  error(message, errorOrData = {}, additionalData = {}) {
    let error = null;
    let data = {};

    // Handle both error(msg, error, data) and error(msg, data) signatures
    if (errorOrData instanceof Error) {
      error = errorOrData;
      data = additionalData;
    } else {
      data = errorOrData;
      error = data.error;
    }

    const logData = {
      ...data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            isOperational: isOperationalError(error),
            ...(error.toJSON ? error.toJSON() : {}),
          }
        : undefined,
    };

    this._log(LogLevel.ERROR, message, logData);
  }

  /**
   * Log API call
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request/response data
   */
  api(method, endpoint, data = {}) {
    this.debug(`API ${method} ${endpoint}`, {
      type: 'api',
      method,
      endpoint,
      ...data,
    });
  }

  /**
   * Log user action
   * @param {string} action - Action name
   * @param {object} data - Action data
   */
  userAction(action, data = {}) {
    this.info(`User action: ${action}`, {
      type: 'user_action',
      action,
      ...data,
    });
  }

  /**
   * Log performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {object} data - Additional data
   */
  performance(metric, value, data = {}) {
    this.debug(`Performance: ${metric}`, {
      type: 'performance',
      metric,
      value,
      unit: 'ms',
      ...data,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods
export default logger;
