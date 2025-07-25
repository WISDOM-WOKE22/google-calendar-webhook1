"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = __importDefault(require("./database"));
const googleCalendar_1 = __importDefault(require("./googleCalendar"));
const error_1 = require("./error");
class CalendarService {
    extractEventIdFromResourceUri(resourceUri) {
        try {
            const match = resourceUri.match(/\/events\/([^\/]+)$/);
            return match ? match[1] || null : null;
        }
        catch (error) {
            logger_1.default.error('Error extracting event ID from resource URI:', error);
            return null;
        }
    }
    async fetchEvents(request) {
        try {
            const { startTime, endTime } = request;
            // Check if this time range has been cached
            const isCached = await database_1.default.isTimeRangeCached(startTime, endTime);
            if (isCached) {
                logger_1.default.info(`Using cached data for time range: ${startTime} to ${endTime}`);
                const events = await database_1.default.getEvents(startTime, endTime);
                return {
                    success: true,
                    data: events,
                    cached: true,
                    message: 'Events retrieved from cache',
                };
            }
            // Fetch from Google Calendar API
            logger_1.default.info(`Fetching events from Google Calendar for time range: ${startTime} to ${endTime}`);
            const response = await googleCalendar_1.default.getEvents(startTime, endTime);
            if (!response.success) {
                throw new error_1.ExternalServiceError(response.error || 'Failed to fetch events from Google Calendar', 'GOOGLE_CALENDAR_FETCH_ERROR');
            }
            const events = response.data;
            // Store events in database
            for (const event of events) {
                await database_1.default.saveEvent(event);
            }
            // Cache this time range
            await database_1.default.cacheTimeRange(startTime, endTime);
            logger_1.default.info(`Stored ${events.length} events in database`);
            return {
                success: true,
                data: events,
                cached: false,
                message: 'Events fetched and stored successfully',
            };
        }
        catch (error) {
            throw (0, error_1.handleServiceError)(error, 'fetchEvents');
        }
    }
    async handleWebhookNotification(notification) {
        try {
            logger_1.default.info('Processing webhook notification:', notification);
            const { state, resourceUri } = notification;
            if (state === 'sync') {
                // Initial sync notification, no action needed
                logger_1.default.info('Received sync notification, no action required');
                return {
                    success: true,
                    message: 'Sync notification received',
                };
            }
            // Extract event ID from resource URI
            const eventId = this.extractEventIdFromResourceUri(resourceUri);
            if (!eventId) {
                logger_1.default.error('Could not extract event ID from resource URI:', resourceUri);
                return {
                    success: false,
                    message: 'Invalid resource URI',
                };
            }
            // Fetch the updated event from Google Calendar
            const response = await googleCalendar_1.default.getEvent(eventId);
            if (!response.success) {
                // Event might have been deleted
                await database_1.default.deleteEvent(eventId);
                logger_1.default.info(`Event ${eventId} marked as deleted`);
                return {
                    success: true,
                    message: 'Event deleted',
                };
            }
            const event = response.data;
            // Update the event in our database
            await database_1.default.updateEvent(event);
            logger_1.default.info(`Updated event ${eventId} in database`);
            return {
                success: true,
                message: 'Event updated successfully',
            };
        }
        catch (error) {
            logger_1.default.error('Error handling webhook notification:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async handleEventCreated(eventId) {
        try {
            logger_1.default.info(`Handling event creation for: ${eventId}`);
            // Fetch the new event from Google Calendar
            const response = await googleCalendar_1.default.getEvent(eventId);
            if (!response.success) {
                return {
                    success: false,
                    message: response.error || 'Failed to fetch created event',
                };
            }
            const event = response.data;
            // Store the new event in our database
            await database_1.default.saveEvent(event);
            logger_1.default.info(`Stored new event ${eventId} in database`);
            return {
                success: true,
                message: 'Event created successfully',
            };
        }
        catch (error) {
            logger_1.default.error(`Error handling event creation for ${eventId}:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async handleEventUpdated(eventId) {
        try {
            logger_1.default.info(`Handling event update for: ${eventId}`);
            // Fetch the updated event from Google Calendar
            const response = await googleCalendar_1.default.getEvent(eventId);
            if (!response.success) {
                return {
                    success: false,
                    message: response.error || 'Failed to fetch updated event',
                };
            }
            const event = response.data;
            // Update the event in our database
            await database_1.default.updateEvent(event);
            logger_1.default.info(`Updated event ${eventId} in database`);
            return {
                success: true,
                message: 'Event updated successfully',
            };
        }
        catch (error) {
            logger_1.default.error(`Error handling event update for ${eventId}:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async handleEventDeleted(eventId) {
        try {
            logger_1.default.info(`Handling event deletion for: ${eventId}`);
            // Mark the event as deleted in our database
            await database_1.default.deleteEvent(eventId);
            logger_1.default.info(`Marked event ${eventId} as deleted in database`);
            return {
                success: true,
                message: 'Event deleted successfully',
            };
        }
        catch (error) {
            logger_1.default.error(`Error handling event deletion for ${eventId}:`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async clearCache() {
        try {
            // This would require adding a method to the database service
            // For now, we'll just log the request
            logger_1.default.info('Cache clear requested');
        }
        catch (error) {
            logger_1.default.error('Error clearing cache:', error);
        }
    }
    async getCacheStats() {
        try {
            // This would require adding methods to the database service
            // For now, we'll return a basic structure
            return {
                cachedRanges: 0,
                totalEvents: 0,
            };
        }
        catch (error) {
            logger_1.default.error('Error getting cache stats:', error);
            return null;
        }
    }
}
exports.CalendarService = CalendarService;
exports.default = new CalendarService();
