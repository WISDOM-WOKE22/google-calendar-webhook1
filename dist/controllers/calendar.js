"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookSubscription = exports.pushWebhookNotification = exports.getEvents = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const calendarService_1 = __importDefault(require("../services/calendarService"));
const googleCalendar_1 = __importDefault(require("../services/googleCalendar"));
const error_1 = require("../services/error");
const response_1 = require("../services/response");
dotenv_1.default.config();
// Protect this route
exports.getEvents = (0, error_1.asyncHandler)(async (req, res) => {
    try {
        logger_1.default.info('Making Google Calendar API request...');
        const { startTime, endTime } = req.query;
        // Validate required query parameters
        (0, error_1.validateRequiredFields)({ startTime, endTime }, ['startTime', 'endTime']);
        const accessToken = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided',
                message: 'Include Authorization: Bearer <token> header',
            });
        }
        // Validate date range
        (0, error_1.validateDateRange)(startTime, endTime);
        // Set access token for the service
        googleCalendar_1.default.setAccessToken(accessToken);
        // Fetch events using the service
        const result = await googleCalendar_1.default.getEvents(startTime, endTime);
        if (!result.success) {
            throw new error_1.ValidationError(result.error || 'Failed to fetch events');
        }
        const events = result.data || [];
        res.json((0, response_1.formatSuccessResponse)(events, 'Fetched events successfully', {
            cached: false,
            count: events.length,
        }));
    }
    catch (err) {
        let errorMessage = 'Unknown error';
        if (err instanceof error_1.ValidationError) {
            throw err;
        }
        if (err instanceof Error) {
            if (err.message.includes('No access, refresh token, API key or refresh handler callback is set')) {
                errorMessage =
                    'Authentication required. Please provide a valid access token.';
            }
            else if (err.message.includes('invalid_grant')) {
                errorMessage = 'Access token has expired. Please re-authenticate.';
            }
            else if (err.message.includes('access_denied')) {
                errorMessage =
                    'Access denied. Please check your Google Calendar permissions.';
            }
            else {
                errorMessage = err.message;
            }
        }
        throw new error_1.ValidationError(errorMessage);
    }
});
exports.pushWebhookNotification = (0, error_1.asyncHandler)(async (req, res) => {
    const notification = req.body;
    const webhookSecret = req.headers['x-webhook-secret'];
    if (!webhookSecret || webhookSecret !== config_1.default.webhook.secret) {
        logger_1.default.warn('Invalid webhook secret received');
        throw new error_1.AuthenticationError('Invalid webhook secret', 'INVALID_WEBHOOK_SECRET');
    }
    const response = await calendarService_1.default.handleWebhookNotification(notification);
    if (!response.success) {
        throw new error_1.ValidationError(response.message || 'Failed to handle webhook notification');
    }
    res.json((0, response_1.formatSuccessResponse)(null, response.message));
});
// Create a new webhook subscription using the google calendar service
exports.createWebhookSubscription = (0, error_1.asyncHandler)(async (req, res) => {
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
        logger_1.default.info(`Received access token for webhook subscription: ${accessToken}`);
        // Set access token for the service
        googleCalendar_1.default.setAccessToken(accessToken);
        // Use the service to create a webhook subscription
        const result = await googleCalendar_1.default.createWebhookSubscription('primary');
        if (!result.success) {
            throw new error_1.ValidationError(result.error || 'Failed to create webhook subscription');
        }
        const { id: channelId, resourceId, expiration, kind } = result.data || {};
        res.json((0, response_1.formatSuccessResponse)({
            channelId,
            resourceId,
            expiration,
            kind,
        }, 'Webhook subscription created successfully'));
    }
    catch (err) {
        let errorMessage = 'Unknown error';
        if (err instanceof error_1.ValidationError) {
            throw err;
        }
        if (err.response?.data?.error?.message) {
            errorMessage = err.response.data.error.message;
        }
        else if (err instanceof Error) {
            if (err.message.includes('No access, refresh token, API key or refresh handler callback is set')) {
                errorMessage =
                    'Authentication required. Please provide a valid access token.';
            }
            else if (err.message.includes('invalid_grant')) {
                errorMessage = 'Access token has expired. Please re-authenticate.';
            }
            else if (err.message.includes('access_denied')) {
                errorMessage =
                    'Access denied. Please check your Google Calendar permissions.';
            }
            else {
                errorMessage = err.message;
            }
        }
        logger_1.default.error('Error creating webhook subscription:', errorMessage);
        throw new error_1.ValidationError(errorMessage);
    }
});
