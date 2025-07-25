"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    database: {
        url: process.env.DATABASE_URL || 'file:./calendar_events.db',
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI ||
            'http://localhost:3000/api/auth/google/callback',
    },
    webhook: {
        baseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
        path: process.env.WEBHOOK_PATH || '/webhook/calendar',
        secret: process.env.WEBHOOK_SECRET || 'default-secret',
    },
};
// Validate required configuration
const validateConfig = () => {
    const requiredFields = [
        'google.clientId',
        'google.clientSecret',
        'webhook.secret',
    ];
    for (const field of requiredFields) {
        const value = field
            .split('.')
            .reduce((obj, key) => obj?.[key], config);
        if (!value) {
            throw new Error(`Missing required configuration: ${field}`);
        }
    }
};
validateConfig();
exports.default = config;
