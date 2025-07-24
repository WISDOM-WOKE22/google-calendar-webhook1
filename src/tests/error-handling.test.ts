import request from 'supertest';
import express from 'express';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  asyncHandler,
  formatSuccessResponse,
  errorHandler,
  notFoundHandler,
} from '@/services/error';

// Create a test app
const app = express();
app.use(express.json());

// Test routes
app.get(
  '/test/success',
  asyncHandler(async (req, res) => {
    res.json(formatSuccessResponse({ message: 'Success' }, 'Test successful'));
  }),
);

app.get(
  '/test/validation-error',
  asyncHandler(async (req, res) => {
    throw new ValidationError('Invalid input data', 'TEST_VALIDATION_ERROR');
  }),
);

app.get(
  '/test/not-found',
  asyncHandler(async (req, res) => {
    throw new NotFoundError('Resource not found', 'TEST_NOT_FOUND');
  }),
);

app.get(
  '/test/auth-error',
  asyncHandler(async (req, res) => {
    throw new AuthenticationError('Authentication failed', 'TEST_AUTH_ERROR');
  }),
);

app.get(
  '/test/async-error',
  asyncHandler(async (req, res) => {
    throw new Error('Async error occurred');
  }),
);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

describe('Error Handling System', () => {
  describe('Success Responses', () => {
    it('should return properly formatted success response', async () => {
      const response = await request(app).get('/test/success').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { message: 'Success' },
        message: 'Test successful',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Error Responses', () => {
    it('should handle validation errors', async () => {
      const response = await request(app)
        .get('/test/validation-error')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Invalid input data',
          code: 'TEST_VALIDATION_ERROR',
          statusCode: 400,
          timestamp: expect.any(String),
          path: '/test/validation-error',
        },
      });
    });

    it('should handle not found errors', async () => {
      const response = await request(app).get('/test/not-found').expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Resource not found',
          code: 'TEST_NOT_FOUND',
          statusCode: 404,
          timestamp: expect.any(String),
          path: '/test/not-found',
        },
      });
    });

    it('should handle authentication errors', async () => {
      const response = await request(app).get('/test/auth-error').expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Authentication failed',
          code: 'TEST_AUTH_ERROR',
          statusCode: 401,
          timestamp: expect.any(String),
          path: '/test/auth-error',
        },
      });
    });

    it('should handle generic async errors', async () => {
      const response = await request(app).get('/test/async-error').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Async error occurred',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
          timestamp: expect.any(String),
          path: '/test/async-error',
        },
      });
    });
  });

  describe('404 Handler', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          message: 'Route /non-existent-route not found',
          code: 'NOT_FOUND_ERROR',
          statusCode: 404,
          timestamp: expect.any(String),
          path: '/non-existent-route',
        },
      });
    });
  });
});

export default app;
