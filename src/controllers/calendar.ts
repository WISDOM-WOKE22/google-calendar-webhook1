import { Request, Response } from 'express';
import dotenv from 'dotenv';
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

dotenv.config();

// Protect this route
export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  try {
    logger.info('Making Google Calendar API request...');
    const { startTime, endTime } = req.query;

    // Validate required query parameters
    validateRequiredFields({ startTime, endTime }, ['startTime', 'endTime']);

    const accessToken = req.headers.authorization?.replace('Bearer ', '').trim();

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        error: 'No access token provided',
        message: 'Include Authorization: Bearer <token> header',
      });
    }

    // Validate date range
    validateDateRange(startTime as string, endTime as string);

    // Set access token for the service
    googleCalendarService.setAccessToken(accessToken);

    // Fetch events using the service
    const result = await googleCalendarService.getEvents(
      startTime as string,
      endTime as string,
    );

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to fetch events');
    }

    const events = result.data || [];

    res.json(
      formatSuccessResponse(events, 'Fetched events successfully', {
        cached: false,
        count: events.length,
      }),
    );
  } catch (err: any) {
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

// Create a new webhook subscription using the google calendar service
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

      // Set access token for the service
      googleCalendarService.setAccessToken(accessToken);

      // Use the service to create a webhook subscription
      const result = await googleCalendarService.createWebhookSubscription('primary');

      if (!result.success) {
        throw new ValidationError(result.error || 'Failed to create webhook subscription');
      }

      const { id: channelId, resourceId, expiration, kind } = result.data || {};

      res.json(
        formatSuccessResponse(
          {
            channelId,
            resourceId,
            expiration,
            kind,
          },
          'Webhook subscription created successfully',
        ),
      );
    } catch (err: any) {
      let errorMessage = 'Unknown error';
      if (err instanceof ValidationError) {
        throw err;
      }
      if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err instanceof Error) {
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
      logger.error('Error creating webhook subscription:', errorMessage);
      throw new ValidationError(errorMessage);
    }
  },
);
