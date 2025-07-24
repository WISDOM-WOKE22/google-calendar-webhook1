export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  created: string;
  updated: string;
  status?: string;
  htmlLink?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
}

export interface WebhookNotification {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  expiration: string;
  state: string;
}

export interface WebhookSubscription {
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  expiration: string;
  state: string;
  created: string;
  updated: string;
}

export interface CalendarEventRecord {
  id: string;
  event_id: string;
  summary?: string | undefined;
  description?: string | undefined;
  location?: string | undefined;
  start_datetime?: string | undefined;
  end_datetime?: string | undefined;
  start_date?: string | undefined;
  end_date?: string | undefined;
  timezone?: string | undefined;
  status?: string | undefined;
  html_link?: string | undefined;
  created: string;
  updated: string;
  deleted_at?: string | undefined;
}

export interface FetchRequest {
  startTime: string;
  endTime: string;
}

export interface FetchResponse {
  success: boolean;
  data: GoogleCalendarEvent[];
  cached: boolean;
  message?: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface WebhookConfig {
  baseUrl: string;
  path: string;
  secret: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  database: DatabaseConfig;
  google: GoogleConfig;
  webhook: WebhookConfig;
}

export interface SubscriptionRenewalResult {
  success: boolean;
  newExpiration?: string;
  error?: string;
}

export interface CalendarServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Error handling types
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    stack?: string;
    [key: string]: any;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: any;
  timestamp: string;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;
