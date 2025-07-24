import dotenv from 'dotenv';
import { AppConfig } from '../types';

dotenv.config();

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL || 'file:./calendar_events.db',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/auth/google/callback',
  },
  webhook: {
    baseUrl: process.env.WEBHOOK_BASE_URL || 'http://localhost:3000',
    path: process.env.WEBHOOK_PATH || '/webhook/calendar',
    secret: process.env.WEBHOOK_SECRET || 'default-secret',
  },
};

// Validate required configuration
const validateConfig = (): void => {
  const requiredFields = [
    'google.clientId',
    'google.clientSecret',
    'webhook.secret',
  ];

  for (const field of requiredFields) {
    const value = field
      .split('.')
      .reduce((obj, key) => obj?.[key as keyof typeof obj], config as any);
    if (!value) {
      throw new Error(`Missing required configuration: ${field}`);
    }
  }
};

validateConfig();

export default config;
