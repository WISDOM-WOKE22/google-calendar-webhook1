import logger from '../utils/logger';
import {
  FetchRequest,
  DatabaseConfig,
  GoogleCalendarEvent,
  WebhookResponse,
  FetchResponse,
} from '../types';
import databaseService from './database';
import googleCalendarService from './googleCalendar';
import {
  handleServiceError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
} from './error';

export class CalendarService {
  private extractEventIdFromResourceUri(resourceUri: string): string | null {
    try {
      const match = resourceUri.match(/\/events\/([^\/]+)$/);
      return match ? match[1] || null : null;
    } catch (error) {
      logger.error('Error extracting event ID from resource URI:', error);
      return null;
    }
  }

  async fetchEvents(request: FetchRequest): Promise<FetchResponse> {
    try {
      const { startTime, endTime } = request;

      // Check if this time range has been cached
      const isCached = await databaseService.isTimeRangeCached(
        startTime,
        endTime,
      );

      if (isCached) {
        logger.info(
          `Using cached data for time range: ${startTime} to ${endTime}`,
        );
        const events = await databaseService.getEvents(startTime, endTime);
        return {
          success: true,
          data: events,
          cached: true,
          message: 'Events retrieved from cache',
        };
      }

      // Fetch from Google Calendar API
      logger.info(
        `Fetching events from Google Calendar for time range: ${startTime} to ${endTime}`,
      );
      const response = await googleCalendarService.getEvents(
        startTime,
        endTime,
      );

      if (!response.success) {
        throw new ExternalServiceError(
          response.error || 'Failed to fetch events from Google Calendar',
          'GOOGLE_CALENDAR_FETCH_ERROR',
        );
      }

      const events = response.data as GoogleCalendarEvent[];

      // Store events in database
      for (const event of events) {
        await databaseService.saveEvent(event);
      }

      // Cache this time range
      await databaseService.cacheTimeRange(startTime, endTime);

      logger.info(`Stored ${events.length} events in database`);

      return {
        success: true,
        data: events,
        cached: false,
        message: 'Events fetched and stored successfully',
      };
    } catch (error) {
      throw handleServiceError(error, 'fetchEvents');
    }
  }

  async handleWebhookNotification(notification: any): Promise<WebhookResponse> {
    try {
      logger.info('Processing webhook notification:', notification);

      const { state, resourceUri } = notification;

      if (state === 'sync') {
        // Initial sync notification, no action needed
        logger.info('Received sync notification, no action required');
        return {
          success: true,
          message: 'Sync notification received',
        };
      }

      // Extract event ID from resource URI
      const eventId = this.extractEventIdFromResourceUri(resourceUri);

      if (!eventId) {
        logger.error(
          'Could not extract event ID from resource URI:',
          resourceUri,
        );
        return {
          success: false,
          message: 'Invalid resource URI',
        };
      }

      // Fetch the updated event from Google Calendar
      const response = await googleCalendarService.getEvent(eventId);

      if (!response.success) {
        // Event might have been deleted
        await databaseService.deleteEvent(eventId);
        logger.info(`Event ${eventId} marked as deleted`);
        return {
          success: true,
          message: 'Event deleted',
        };
      }

      const event = response.data as GoogleCalendarEvent;

      // Update the event in our database
      await databaseService.updateEvent(event);

      logger.info(`Updated event ${eventId} in database`);

      return {
        success: true,
        message: 'Event updated successfully',
      };
    } catch (error) {
      logger.error('Error handling webhook notification:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleEventCreated(eventId: string): Promise<WebhookResponse> {
    try {
      logger.info(`Handling event creation for: ${eventId}`);

      // Fetch the new event from Google Calendar
      const response = await googleCalendarService.getEvent(eventId);

      if (!response.success) {
        return {
          success: false,
          message: response.error || 'Failed to fetch created event',
        };
      }

      const event = response.data as GoogleCalendarEvent;

      // Store the new event in our database
      await databaseService.saveEvent(event);

      logger.info(`Stored new event ${eventId} in database`);

      return {
        success: true,
        message: 'Event created successfully',
      };
    } catch (error) {
      logger.error(`Error handling event creation for ${eventId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleEventUpdated(eventId: string): Promise<WebhookResponse> {
    try {
      logger.info(`Handling event update for: ${eventId}`);

      // Fetch the updated event from Google Calendar
      const response = await googleCalendarService.getEvent(eventId);

      if (!response.success) {
        return {
          success: false,
          message: response.error || 'Failed to fetch updated event',
        };
      }

      const event = response.data as GoogleCalendarEvent;

      // Update the event in our database
      await databaseService.updateEvent(event);

      logger.info(`Updated event ${eventId} in database`);

      return {
        success: true,
        message: 'Event updated successfully',
      };
    } catch (error) {
      logger.error(`Error handling event update for ${eventId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async handleEventDeleted(eventId: string): Promise<WebhookResponse> {
    try {
      logger.info(`Handling event deletion for: ${eventId}`);

      // Mark the event as deleted in our database
      await databaseService.deleteEvent(eventId);

      logger.info(`Marked event ${eventId} as deleted in database`);

      return {
        success: true,
        message: 'Event deleted successfully',
      };
    } catch (error) {
      logger.error(`Error handling event deletion for ${eventId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async clearCache(): Promise<void> {
    try {
      // This would require adding a method to the database service
      // For now, we'll just log the request
      logger.info('Cache clear requested');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  async getCacheStats(): Promise<any> {
    try {
      // This would require adding methods to the database service
      // For now, we'll return a basic structure
      return {
        cachedRanges: 0,
        totalEvents: 0,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}

export default new CalendarService();
