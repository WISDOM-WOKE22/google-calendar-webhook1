import {
  errorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
} from '../services/error';

// Setup global error handlers for unhandled rejections and exceptions
setupGlobalErrorHandlers();

// Export the error handling middleware
export { errorHandler, notFoundHandler };
