import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import logger from '../utils/logger';
import config from '../config';
import databaseService from './database';
import {
  GoogleCalendarEvent,
  SubscriptionRenewalResult,
  CalendarServiceResponse,
} from '../types';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
    );
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  setAccessToken(accessToken: string): void {
    this.oauth2Client.setCredentials({ access_token: accessToken });
  }

  async getEvents(
    startTime: string,
    endTime: string,
  ): Promise<CalendarServiceResponse> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      logger.info(`Fetched ${events.length} events from Google Calendar`);

      return {
        success: true,
        data: events,
      };
    } catch (error) {
      logger.error('Error fetching events:', error);
      return {
        success: false,
        error: 'Failed to fetch events',
      };
    }
  }

  async createWebhookSubscription(
    calendarId: string = 'primary',
  ): Promise<CalendarServiceResponse> {
    try {
      const webhookUrl = `${config.webhook.baseUrl}${config.webhook.path}`;

      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: `calendar-webhook-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          token: config.webhook.secret,
          params: {
            ttl: '604800', // 7 days in seconds
          },
        },
      });

      const subscription = response.data;
      logger.info('Created webhook subscription:', subscription.id);

      // Save subscription to database
      await databaseService.saveSubscription({
        id: subscription.id,
        resourceId: subscription.resourceId,
        resourceUri: subscription.resourceUri,
        token: subscription.token,
        expiration: subscription.expiration,
        state: 'active',
      });

      return {
        success: true,
        data: subscription,
      };
    } catch (error) {
      logger.error('Failed to create webhook subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async renewWebhookSubscription(
    subscriptionId: string,
    resourceId: string,
  ): Promise<SubscriptionRenewalResult> {
    try {
      const webhookUrl = `${config.webhook.baseUrl}${config.webhook.path}`;

      const response = await this.calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: subscriptionId,
          type: 'web_hook',
          address: webhookUrl,
          token: config.webhook.secret,
          params: {
            ttl: '2592000', // 30 days in seconds (maximum allowed)
          },
        },
      });

      const newSubscription = response.data;
      logger.info('Renewed webhook subscription:', newSubscription.id);

      // Update subscription in database
      await databaseService.updateSubscriptionExpiration(
        subscriptionId,
        newSubscription.expiration,
      );

      return {
        success: true,
        newExpiration: newSubscription.expiration,
      };
    } catch (error) {
      logger.error('Failed to renew webhook subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async stopWebhookSubscription(
    subscriptionId: string,
    resourceId: string,
  ): Promise<boolean> {
    try {
      await this.calendar.events.stop({
        calendarId: 'primary',
        requestBody: {
          id: subscriptionId,
          resourceId,
        },
      });

      logger.info('Stopped webhook subscription:', subscriptionId);
      return true;
    } catch (error) {
      logger.error('Failed to stop webhook subscription:', error);
      return false;
    }
  }

  async getEvent(eventId: string): Promise<CalendarServiceResponse> {
    try {
      const response = await this.calendar.events.get(
        {
          calendarId: 'primary',
          eventId,
        },
        {
          timeout: 30000, // 30 second timeout
          retry: {
            retries: 3,
            factor: 2,
            minTimeout: 1000,
            maxTimeout: 10000,
          },
        },
      );

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to fetch event from Google Calendar:', error);
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (
          error.message.includes(
            'No access, refresh token, API key or refresh handler callback is set',
          )
        ) {
          errorMessage =
            'Authentication required. Please provide a valid access token.';
        } else if (error.message.includes('invalid_grant')) {
          errorMessage = 'Access token has expired. Please re-authenticate.';
        } else if (error.message.includes('access_denied')) {
          errorMessage =
            'Access denied. Please check your Google Calendar permissions.';
        } else if (
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('timeout')
        ) {
          errorMessage =
            'Network timeout. Please check your internet connection and try again.';
        } else if (
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ECONNREFUSED')
        ) {
          errorMessage =
            'Network connectivity issue. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async createEvent(
    event: Partial<GoogleCalendarEvent>,
  ): Promise<CalendarServiceResponse> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      logger.info('Created event in Google Calendar:', response.data.id);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to create event in Google Calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async updateEvent(
    eventId: string,
    event: Partial<GoogleCalendarEvent>,
  ): Promise<CalendarServiceResponse> {
    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId,
        requestBody: event,
      });

      logger.info('Updated event in Google Calendar:', response.data.id);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      logger.error('Failed to update event in Google Calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteEvent(eventId: string): Promise<CalendarServiceResponse> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      logger.info('Deleted event from Google Calendar:', eventId);
      return {
        success: true,
      };
    } catch (error) {
      logger.error('Failed to delete event from Google Calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async getTokensFromCode(
    code: string,
  ): Promise<{ access_token: string; refresh_token?: string }> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || undefined,
      };
    } catch (error) {
      logger.error('Failed to get tokens from code:', error);
      throw error;
    }
  }
}

export default new GoogleCalendarService();
