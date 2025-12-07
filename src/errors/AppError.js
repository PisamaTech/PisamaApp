/**
 * Base class for all custom application errors
 * Extends the native Error class with additional metadata
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {object} options - Additional error options
   * @param {string} options.code - Error code for programmatic handling
   * @param {number} options.statusCode - HTTP status code if applicable
   * @param {boolean} options.isOperational - Whether this is an operational error (vs programming error)
   * @param {object} options.metadata - Additional context about the error
   */
  constructor(message, { code, statusCode, isOperational = true, metadata = {} } = {}) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Serialize error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'AUTH_ERROR',
      statusCode: options.statusCode || 401,
      ...options,
    });
  }
}

/**
 * Validation errors (form inputs, schemas, etc.)
 */
export class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'VALIDATION_ERROR',
      statusCode: options.statusCode || 400,
      ...options,
    });
  }
}

/**
 * Booking conflict errors (double booking, resource unavailable, etc.)
 */
export class BookingConflictError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'BOOKING_CONFLICT',
      statusCode: options.statusCode || 409,
      ...options,
    });
  }
}

/**
 * Network and API communication errors
 */
export class NetworkError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'NETWORK_ERROR',
      statusCode: options.statusCode || 503,
      ...options,
    });
  }
}

/**
 * Database errors (Supabase operations)
 */
export class DatabaseError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'DATABASE_ERROR',
      statusCode: options.statusCode || 500,
      ...options,
    });
  }
}

/**
 * Not found errors (resource doesn't exist)
 */
export class NotFoundError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'NOT_FOUND',
      statusCode: options.statusCode || 404,
      ...options,
    });
  }
}

/**
 * Permission denied errors (user lacks permission)
 */
export class PermissionError extends AppError {
  constructor(message, options = {}) {
    super(message, {
      code: options.code || 'PERMISSION_DENIED',
      statusCode: options.statusCode || 403,
      ...options,
    });
  }
}

/**
 * Helper function to determine if an error is an operational error
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
export function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper function to convert unknown errors to AppError
 * @param {unknown} error - The error to convert
 * @returns {AppError}
 */
export function normalizeError(error) {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Supabase error format
  if (error?.message && error?.code) {
    return new DatabaseError(error.message, {
      code: error.code,
      metadata: {
        details: error.details,
        hint: error.hint,
      },
    });
  }

  // Standard Error
  if (error instanceof Error) {
    return new AppError(error.message, {
      code: 'UNKNOWN_ERROR',
      metadata: { originalError: error.name },
    });
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(error, { code: 'UNKNOWN_ERROR' });
  }

  // Unknown error type
  return new AppError('An unknown error occurred', {
    code: 'UNKNOWN_ERROR',
    metadata: { error },
  });
}
