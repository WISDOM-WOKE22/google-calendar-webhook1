"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookSubscription = exports.pushWebhookNotification = exports.getEvents = void 0;
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const calendarService_1 = __importDefault(require("../services/calendarService"));
const googleCalendar_1 = __importDefault(require("../services/googleCalendar"));
const error_1 = require("../services/error");
const response_1 = require("../services/response");
// Protect this route
exports.getEvents = (0, error_1.asyncHandler)(async (req, res) => {
    try {
        logger_1.default.info('Making Google Calendar API request...');
        const { startTime, endTime } = req.query;
        // Validate required query parameters
        (0, error_1.validateRequiredFields)({ startTime, endTime }, ['startTime', 'endTime']);
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                error: 'No access token provided',
                message: 'Include Authorization: Bearer <token> header',
            });
        }
        // Set the access token for Google Calendar service
        googleCalendar_1.default.setAccessToken(accessToken);
        // Validate date range
        (0, error_1.validateDateRange)(startTime, endTime);
        const request = {
            startTime: startTime,
            endTime: endTime,
        };
        const response = await calendarService_1.default.fetchEvents(request);
        if (!response.success) {
            let errorMessage = 'Unknown error';
            if (response.message) {
                if (response.message.includes('No access, refresh token, API key or refresh handler callback is set')) {
                    errorMessage =
                        'Authentication required. Please provide a valid access token.';
                }
                else if (response.message.includes('invalid_grant')) {
                    errorMessage = 'Access token has expired. Please re-authenticate.';
                }
                else if (response.message.includes('access_denied')) {
                    errorMessage =
                        'Access denied. Please check your Google Calendar permissions.';
                }
                else {
                    errorMessage = response.message;
                }
            }
            throw new error_1.ValidationError(errorMessage || 'Failed to fetch events');
        }
        res.json((0, response_1.formatSuccessResponse)(response.data, response.message, {
            cached: response.cached,
            count: response.data.length,
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
// Protect the route
// Create a new webhook subscription
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
        // Pass the accessToken to the service so it can be used for authentication
        const response = await googleCalendar_1.default.createWebhookSubscription(accessToken);
        if (!response.success) {
            throw new error_1.ValidationError(response.error || 'Failed to create webhook subscription');
        }
        res.json((0, response_1.formatSuccessResponse)(response.data, 'Webhook subscription created successfully'));
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
