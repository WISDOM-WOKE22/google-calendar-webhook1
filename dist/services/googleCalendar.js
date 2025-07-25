"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarService = void 0;
const google_auth_library_1 = require("google-auth-library");
const googleapis_1 = require("googleapis");
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = __importDefault(require("../config"));
const database_1 = __importDefault(require("./database"));
class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google_auth_library_1.OAuth2Client(config_1.default.google.clientId, config_1.default.google.clientSecret, config_1.default.google.redirectUri);
        this.calendar = googleapis_1.google.calendar({ version: 'v3', auth: this.oauth2Client });
    }
    setAccessToken(accessToken) {
        this.oauth2Client.setCredentials({ access_token: accessToken });
    }
    async getEvents(startTime, endTime) {
        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: startTime,
                timeMax: endTime,
                singleEvents: true,
                orderBy: 'startTime',
            });
            const events = response.data.items || [];
            logger_1.default.info(`Fetched ${events.length} events from Google Calendar`);
            return {
                success: true,
                data: events,
            };
        }
        catch (error) {
            logger_1.default.error('Error fetching events:', error);
            return {
                success: false,
                error: 'Failed to fetch events',
            };
        }
    }
    async createWebhookSubscription(calendarId = 'primary') {
        try {
            const webhookUrl = `${config_1.default.webhook.baseUrl}${config_1.default.webhook.path}`;
            const response = await this.calendar.events.watch({
                calendarId,
                requestBody: {
                    id: `calendar-webhook-${Date.now()}`,
                    type: 'web_hook',
                    address: webhookUrl,
                    token: config_1.default.webhook.secret,
                    params: {
                        ttl: '604800', // 7 days in seconds
                    },
                },
            });
            const subscription = response.data;
            logger_1.default.info('Created webhook subscription:', subscription.id);
            // Save subscription to database
            await database_1.default.saveSubscription({
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
        }
        catch (error) {
            logger_1.default.error('Failed to create webhook subscription:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async renewWebhookSubscription(subscriptionId, resourceId) {
        try {
            const webhookUrl = `${config_1.default.webhook.baseUrl}${config_1.default.webhook.path}`;
            const response = await this.calendar.events.watch({
                calendarId: 'primary',
                requestBody: {
                    id: subscriptionId,
                    type: 'web_hook',
                    address: webhookUrl,
                    token: config_1.default.webhook.secret,
                    params: {
                        ttl: '2592000', // 30 days in seconds (maximum allowed)
                    },
                },
            });
            const newSubscription = response.data;
            logger_1.default.info('Renewed webhook subscription:', newSubscription.id);
            // Update subscription in database
            await database_1.default.updateSubscriptionExpiration(subscriptionId, newSubscription.expiration);
            return {
                success: true,
                newExpiration: newSubscription.expiration,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to renew webhook subscription:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async stopWebhookSubscription(subscriptionId, resourceId) {
        try {
            await this.calendar.events.stop({
                calendarId: 'primary',
                requestBody: {
                    id: subscriptionId,
                    resourceId,
                },
            });
            logger_1.default.info('Stopped webhook subscription:', subscriptionId);
            return true;
        }
        catch (error) {
            logger_1.default.error('Failed to stop webhook subscription:', error);
            return false;
        }
    }
    async getEvent(eventId) {
        try {
            const response = await this.calendar.events.get({
                calendarId: 'primary',
                eventId,
            }, {
                timeout: 30000, // 30 second timeout
                retry: {
                    retries: 3,
                    factor: 2,
                    minTimeout: 1000,
                    maxTimeout: 10000,
                },
            });
            return {
                success: true,
                data: response.data,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to fetch event from Google Calendar:', error);
            let errorMessage = 'Unknown error';
            if (error instanceof Error) {
                if (error.message.includes('No access, refresh token, API key or refresh handler callback is set')) {
                    errorMessage =
                        'Authentication required. Please provide a valid access token.';
                }
                else if (error.message.includes('invalid_grant')) {
                    errorMessage = 'Access token has expired. Please re-authenticate.';
                }
                else if (error.message.includes('access_denied')) {
                    errorMessage =
                        'Access denied. Please check your Google Calendar permissions.';
                }
                else if (error.message.includes('ETIMEDOUT') ||
                    error.message.includes('timeout')) {
                    errorMessage =
                        'Network timeout. Please check your internet connection and try again.';
                }
                else if (error.message.includes('ENOTFOUND') ||
                    error.message.includes('ECONNREFUSED')) {
                    errorMessage =
                        'Network connectivity issue. Please check your internet connection.';
                }
                else {
                    errorMessage = error.message;
                }
            }
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
    async createEvent(event) {
        try {
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
            });
            logger_1.default.info('Created event in Google Calendar:', response.data.id);
            return {
                success: true,
                data: response.data,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to create event in Google Calendar:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async updateEvent(eventId, event) {
        try {
            const response = await this.calendar.events.update({
                calendarId: 'primary',
                eventId,
                requestBody: event,
            });
            logger_1.default.info('Updated event in Google Calendar:', response.data.id);
            return {
                success: true,
                data: response.data,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to update event in Google Calendar:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async deleteEvent(eventId) {
        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId,
            });
            logger_1.default.info('Deleted event from Google Calendar:', eventId);
            return {
                success: true,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to delete event from Google Calendar:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
        });
    }
    async getTokensFromCode(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            return {
                access_token: tokens.access_token || '',
                refresh_token: tokens.refresh_token || undefined,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to get tokens from code:', error);
            throw error;
        }
    }
}
exports.GoogleCalendarService = GoogleCalendarService;
exports.default = new GoogleCalendarService();
