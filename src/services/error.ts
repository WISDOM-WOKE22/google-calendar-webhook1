import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Custom Error Classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code?: string) {
    super(message, 400, code || 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', code?: string) {
    super(message, 401, code || 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', code?: string) {
    super(message, 403, code || 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code || 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code?: string) {
    super(message, 409, code || 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', code?: string) {
    super(message, 429, code || 'RATE_LIMIT_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service error', code?: string) {
    super(message, 502, code || 'EXTERNAL_SERVICE_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', code?: string) {
    super(message, 500, code || 'DATABASE_ERROR');
  }
}

// Error Response Interface
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    stack?: string;
    [key: string]: any;
  };
}

// Error Response Formatter
export const formatErrorResponse = (
  error: AppError | Error,
  req?: Request,
): ErrorResponse => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_SERVER_ERROR';

  return {
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req?.originalUrl,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
  };
};

// Error Handler Middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Log the error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        error = new ConflictError('Resource already exists', 'DUPLICATE_ENTRY');
        break;
      case 'P2025':
        error = new NotFoundError('Record not found', 'RECORD_NOT_FOUND');
        break;
      case 'P2003':
        error = new ValidationError(
          'Foreign key constraint failed',
          'FOREIGN_KEY_ERROR',
        );
        break;
      default:
        error = new DatabaseError(
          'Database operation failed',
          'DATABASE_ERROR',
        );
    }
  }

  // Handle Prisma validation errors
  if (error.name === 'PrismaClientValidationError') {
    error = new ValidationError('Invalid data provided', 'VALIDATION_ERROR');
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token', 'INVALID_TOKEN');
  }

  if (error.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired', 'TOKEN_EXPIRED');
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(error, req);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  res.status(statusCode).json(errorResponse);
};

// Async Error Handler Wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error Utilities
export const handleServiceError = (error: any, context: string): AppError => {
  logger.error(`Service error in ${context}:`, error);

  if (error instanceof AppError) {
    return error;
  }

  // Handle Google API errors
  if (error.code === 401) {
    return new AuthenticationError(
      'Google API authentication failed',
      'GOOGLE_AUTH_ERROR',
    );
  }

  if (error.code === 403) {
    return new AuthorizationError(
      'Google API access denied',
      'GOOGLE_AUTHZ_ERROR',
    );
  }

  if (error.code === 404) {
    return new NotFoundError(
      'Google API resource not found',
      'GOOGLE_NOT_FOUND',
    );
  }

  if (error.code >= 500) {
    return new ExternalServiceError(
      'Google API service unavailable',
      'GOOGLE_SERVICE_ERROR',
    );
  }

  // Handle network errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new ExternalServiceError(
      'Service unavailable',
      'SERVICE_UNAVAILABLE',
    );
  }

  // Default to internal server error
  return new AppError('Internal server error', 500, 'INTERNAL_ERROR');
};

// Validation Utilities
export const validateRequiredFields = (data: any, fields: string[]): void => {
  const missingFields = fields.filter((field) => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], data);
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`,
      'MISSING_REQUIRED_FIELDS',
    );
  }
};

export const validateDateRange = (startTime: string, endTime: string): void => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format', 'INVALID_DATE_FORMAT');
  }

  if (start >= end) {
    throw new ValidationError(
      'Start time must be before end time',
      'INVALID_DATE_RANGE',
    );
  }
};

// Not Found Handler
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  const errorResponse = formatErrorResponse(error, req);
  res.status(404).json(errorResponse);
};

// Graceful Shutdown Handler
export const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close server
  process.exit(0);
};

// Unhandled Rejection Handler
export const handleUnhandledRejection = (
  reason: any,
  promise: Promise<any>,
) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
};

// Uncaught Exception Handler
export const handleUncaughtException = (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
};

// Setup global error handlers
export const setupGlobalErrorHandlers = () => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
