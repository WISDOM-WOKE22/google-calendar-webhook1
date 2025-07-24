import { Request, Response } from 'express';
import { FetchRequest } from '../types';
import config from '../config';
import logger from '../utils/logger';
import calendarService from '../services/calendarService';
import googleCalendarService from '../services/googleCalendar';
import {
  asyncHandler,
  ValidationError,
  AuthenticationError,
  validateRequiredFields,
  validateDateRange,
} from '../services/error';
import { formatSuccessResponse } from '../services/response';

// Protect this route
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  try {
    logger.info('Making Google Calendar API request...');
    const { startTime, endTime } = req.query;

    // Validate required query parameters
    validateRequiredFields({ startTime, endTime }, ['startTime', 'endTime']);

    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided',
        message: 'Include Authorization: Bearer <token> header',
      });
    }

    // Set the access token for Google Calendar service
    googleCalendarService.setAccessToken(accessToken);

    // Validate date range
    validateDateRange(startTime as string, endTime as string);

    const request: FetchRequest = {
      startTime: startTime as string,
      endTime: endTime as string,
    };

    const response = await calendarService.fetchEvents(request);

    if (!response.success) {
      let errorMessage = 'Unknown error';
      if (response.message) {
        if (
          response.message.includes(
            'No access, refresh token, API key or refresh handler callback is set',
          )
        ) {
          errorMessage =
            'Authentication required. Please provide a valid access token.';
        } else if (response.message.includes('invalid_grant')) {
          errorMessage = 'Access token has expired. Please re-authenticate.';
        } else if (response.message.includes('access_denied')) {
          errorMessage =
            'Access denied. Please check your Google Calendar permissions.';
        } else {
          errorMessage = response.message;
        }
      }
      throw new ValidationError(errorMessage || 'Failed to fetch events');
    }

    res.json(
      formatSuccessResponse(response.data, response.message, {
        cached: response.cached,
        count: response.data.length,
      }),
    );
  } catch (err) {
    let errorMessage = 'Unknown error';
    if (err instanceof ValidationError) {
      throw err;
    }
    if (err instanceof Error) {
      if (
        err.message.includes(
          'No access, refresh token, API key or refresh handler callback is set',
        )
      ) {
        errorMessage =
          'Authentication required. Please provide a valid access token.';
      } else if (err.message.includes('invalid_grant')) {
        errorMessage = 'Access token has expired. Please re-authenticate.';
      } else if (err.message.includes('access_denied')) {
        errorMessage =
          'Access denied. Please check your Google Calendar permissions.';
      } else {
        errorMessage = err.message;
      }
    }
    throw new ValidationError(errorMessage);
  }
});

export const pushWebhookNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const notification = req.body;

    const webhookSecret = req.headers['x-webhook-secret'];
    if (!webhookSecret || webhookSecret !== config.webhook.secret) {
      logger.warn('Invalid webhook secret received');
      throw new AuthenticationError(
        'Invalid webhook secret',
        'INVALID_WEBHOOK_SECRET',
      );
    }

    const response =
      await calendarService.handleWebhookNotification(notification);
    if (!response.success) {
      throw new ValidationError(
        response.message || 'Failed to handle webhook notification',
      );
    }

    res.json(formatSuccessResponse(null, response.message));
  },
);

// Protect the route
// Create a new webhook subscription
export const createWebhookSubscription = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No access token provided',
          message: 'Include Authorization: Bearer <token> header',
        });
      }

      const accessToken = authHeader.replace('Bearer ', '').trim();
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Invalid access token',
          message: 'Access token is empty or malformed',
        });
      }

      logger.info(
        `Received access token for webhook subscription: ${accessToken}`,
      );

      // Pass the accessToken to the service so it can be used for authentication
      const response =
        await googleCalendarService.createWebhookSubscription(accessToken);

      if (!response.success) {
        throw new ValidationError(
          response.error || 'Failed to create webhook subscription',
        );
      }

      res.json(
        formatSuccessResponse(
          response.data,
          'Webhook subscription created successfully',
        ),
      );
    } catch (err) {
      let errorMessage = 'Unknown error';
      if (err instanceof ValidationError) {
        throw err;
      }
      if (err instanceof Error) {
        if (
          err.message.includes(
            'No access, refresh token, API key or refresh handler callback is set',
          )
        ) {
          errorMessage =
            'Authentication required. Please provide a valid access token.';
        } else if (err.message.includes('invalid_grant')) {
          errorMessage = 'Access token has expired. Please re-authenticate.';
        } else if (err.message.includes('access_denied')) {
          errorMessage =
            'Access denied. Please check your Google Calendar permissions.';
        } else {
          errorMessage = err.message;
        }
      }
      throw new ValidationError(errorMessage);
    }
  },
);
