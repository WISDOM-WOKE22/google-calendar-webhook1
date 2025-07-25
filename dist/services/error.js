"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGlobalErrorHandlers = exports.handleUncaughtException = exports.handleUnhandledRejection = exports.gracefulShutdown = exports.notFoundHandler = exports.validateDateRange = exports.validateRequiredFields = exports.handleServiceError = exports.asyncHandler = exports.errorHandler = exports.formatErrorResponse = exports.DatabaseError = exports.ExternalServiceError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
// Custom Error Classes
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, code) {
        super(message, 400, code || 'VALIDATION_ERROR');
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', code) {
        super(message, 401, code || 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied', code) {
        super(message, 403, code || 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code) {
        super(message, 404, code || 'NOT_FOUND_ERROR');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict', code) {
        super(message, 409, code || 'CONFLICT_ERROR');
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', code) {
        super(message, 429, code || 'RATE_LIMIT_ERROR');
    }
}
exports.RateLimitError = RateLimitError;
class ExternalServiceError extends AppError {
    constructor(message = 'External service error', code) {
        super(message, 502, code || 'EXTERNAL_SERVICE_ERROR');
    }
}
exports.ExternalServiceError = ExternalServiceError;
class DatabaseError extends AppError {
    constructor(message = 'Database error', code) {
        super(message, 500, code || 'DATABASE_ERROR');
    }
}
exports.DatabaseError = DatabaseError;
// Error Response Formatter
const formatErrorResponse = (error, req) => {
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
exports.formatErrorResponse = formatErrorResponse;
// Error Handler Middleware
const errorHandler = (error, req, res, next) => {
    // Log the error
    logger_1.default.error('Error occurred:', {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    // Handle Prisma errors
    if (error.name === 'PrismaClientKnownRequestError') {
        const prismaError = error;
        switch (prismaError.code) {
            case 'P2002':
                error = new ConflictError('Resource already exists', 'DUPLICATE_ENTRY');
                break;
            case 'P2025':
                error = new NotFoundError('Record not found', 'RECORD_NOT_FOUND');
                break;
            case 'P2003':
                error = new ValidationError('Foreign key constraint failed', 'FOREIGN_KEY_ERROR');
                break;
            default:
                error = new DatabaseError('Database operation failed', 'DATABASE_ERROR');
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
    const errorResponse = (0, exports.formatErrorResponse)(error, req);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// Async Error Handler Wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Error Utilities
const handleServiceError = (error, context) => {
    logger_1.default.error(`Service error in ${context}:`, error);
    if (error instanceof AppError) {
        return error;
    }
    // Handle Google API errors
    if (error.code === 401) {
        return new AuthenticationError('Google API authentication failed', 'GOOGLE_AUTH_ERROR');
    }
    if (error.code === 403) {
        return new AuthorizationError('Google API access denied', 'GOOGLE_AUTHZ_ERROR');
    }
    if (error.code === 404) {
        return new NotFoundError('Google API resource not found', 'GOOGLE_NOT_FOUND');
    }
    if (error.code >= 500) {
        return new ExternalServiceError('Google API service unavailable', 'GOOGLE_SERVICE_ERROR');
    }
    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return new ExternalServiceError('Service unavailable', 'SERVICE_UNAVAILABLE');
    }
    // Default to internal server error
    return new AppError('Internal server error', 500, 'INTERNAL_ERROR');
};
exports.handleServiceError = handleServiceError;
// Validation Utilities
const validateRequiredFields = (data, fields) => {
    const missingFields = fields.filter((field) => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], data);
        return value === undefined || value === null || value === '';
    });
    if (missingFields.length > 0) {
        throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }
};
exports.validateRequiredFields = validateRequiredFields;
const validateDateRange = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new ValidationError('Invalid date format', 'INVALID_DATE_FORMAT');
    }
    if (start >= end) {
        throw new ValidationError('Start time must be before end time', 'INVALID_DATE_RANGE');
    }
};
exports.validateDateRange = validateDateRange;
// Not Found Handler
const notFoundHandler = (req, res) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    const errorResponse = (0, exports.formatErrorResponse)(error, req);
    res.status(404).json(errorResponse);
};
exports.notFoundHandler = notFoundHandler;
// Graceful Shutdown Handler
const gracefulShutdown = (signal) => {
    logger_1.default.info(`Received ${signal}. Starting graceful shutdown...`);
    // Close server
    process.exit(0);
};
exports.gracefulShutdown = gracefulShutdown;
// Unhandled Rejection Handler
const handleUnhandledRejection = (reason, promise) => {
    logger_1.default.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
};
exports.handleUnhandledRejection = handleUnhandledRejection;
// Uncaught Exception Handler
const handleUncaughtException = (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
};
exports.handleUncaughtException = handleUncaughtException;
// Setup global error handlers
const setupGlobalErrorHandlers = () => {
    process.on('unhandledRejection', exports.handleUnhandledRejection);
    process.on('uncaughtException', exports.handleUncaughtException);
    process.on('SIGTERM', () => (0, exports.gracefulShutdown)('SIGTERM'));
    process.on('SIGINT', () => (0, exports.gracefulShutdown)('SIGINT'));
};
exports.setupGlobalErrorHandlers = setupGlobalErrorHandlers;
