import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import prisma from './prisma';
import { GoogleCalendarEvent } from '../types';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // Removed buggy createEvent (wrong model name)
  // Use saveEvent for event creation/upsert

  async initalizeDatabase(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Error connecting to database', error);
      throw error;
    }
  }

  async saveEvent(event: GoogleCalendarEvent): Promise<void> {
    try {
      await this.prisma.calendarEvent.upsert({
        where: { eventId: event.id },
        update: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          startDateTime: event.start.dateTime,
          endDateTime: event.end.dateTime,
          startDate: event.start.date,
          endDate: event.end.date,
          timezone: event.start.timeZone,
          status: event.status,
          htmlLink: event.htmlLink,
          created: event.created,
          updated: event.updated,
        },
        create: {
          eventId: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          startDateTime: event.start.dateTime,
          endDateTime: event.end.dateTime,
          startDate: event.start.date,
          endDate: event.end.date,
          timezone: event.start.timeZone,
          status: event.status,
          htmlLink: event.htmlLink,
          created: event.created,
          updated: event.updated,
        },
      });
    } catch (error) {
      logger.error('Failed to save event:', error);
      throw error;
    }
  }

  async updateEvent(event: GoogleCalendarEvent): Promise<void> {
    await this.saveEvent(event);
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.prisma.calendarEvent.update({
        where: { eventId },
        data: { deletedAt: new Date().toISOString() },
      });
    } catch (error) {
      logger.error('Failed to delete event:', error);
      throw error;
    }
  }

  async getEvents(
    startTime: string,
    endTime: string,
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          deletedAt: null,
          OR: [
            {
              startDateTime: {
                gte: startTime,
                lte: endTime,
              },
            },
            {
              endDateTime: {
                gte: startTime,
                lte: endTime,
              },
            },
            {
              AND: [
                { startDateTime: { lte: startTime } },
                { endDateTime: { gte: endTime } },
              ],
            },
          ],
        },
        orderBy: { startDateTime: 'asc' },
      });

      return events.map(this.mapPrismaEventToGoogleEvent);
    } catch (error) {
      logger.error('Failed to get events:', error);
      throw error;
    }
  }

  async isTimeRangeCached(
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    try {
      const cacheEntry = await this.prisma.fetchCache.findUnique({
        where: {
          startTime_endTime: {
            startTime,
            endTime,
          },
        },
      });

      return !!cacheEntry;
    } catch (error) {
      logger.error('Failed to check cache:', error);
      return false;
    }
  }

  async cacheTimeRange(startTime: string, endTime: string): Promise<void> {
    try {
      await this.prisma.fetchCache.upsert({
        where: {
          startTime_endTime: {
            startTime,
            endTime,
          },
        },
        update: {
          createdAt: new Date().toISOString(),
        },
        create: {
          startTime,
          endTime,
          createdAt: new Date().toISOString(), // Fix: createdAt is required
        },
      });
    } catch (error) {
      logger.error('Failed to cache time range:', error);
      throw error;
    }
  }

  async saveSubscription(subscription: any): Promise<void> {
    try {
      await this.prisma.webhookSubscription.upsert({
        where: { subscriptionId: subscription.id },
        update: {
          resourceId: subscription.resourceId,
          resourceUri: subscription.resourceUri,
          token: subscription.token,
          expiration: subscription.expiration,
          state: subscription.state,
          updated: new Date().toISOString(),
        },
        create: {
          subscriptionId: subscription.id,
          resourceId: subscription.resourceId,
          resourceUri: subscription.resourceUri,
          token: subscription.token,
          expiration: subscription.expiration,
          state: subscription.state,
          created: new Date().toISOString(), // Fix: created is required
          updated: new Date().toISOString(), // Fix: updated is required
        },
      });
    } catch (error) {
      logger.error('Failed to save subscription:', error);
      throw error;
    }
  }

  async getExpiringSubscriptions(
    hoursBeforeExpiration: number = 24,
  ): Promise<any[]> {
    try {
      const expirationThreshold = new Date();
      expirationThreshold.setHours(
        expirationThreshold.getHours() + hoursBeforeExpiration,
      );

      return await this.prisma.webhookSubscription.findMany({
        where: {
          expiration: {
            lte: expirationThreshold.toISOString(),
          },
          state: 'active',
        },
        orderBy: { expiration: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get expiring subscriptions:', error);
      throw error;
    }
  }

  async updateSubscriptionExpiration(
    subscriptionId: string,
    newExpiration: string,
  ): Promise<void> {
    try {
      await this.prisma.webhookSubscription.update({
        where: { subscriptionId },
        data: {
          expiration: newExpiration,
          updated: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to update subscription expiration:', error);
      throw error;
    }
  }

  async deleteExpiredSubscriptions(): Promise<void> {
    try {
      await this.prisma.webhookSubscription.deleteMany({
        where: {
          expiration: {
            lte: new Date().toISOString(),
          },
          state: 'active', // Fix: state must be inside where
        },
      });
    } catch (error) {
      logger.error('Failed to delete expired subscriptions:', error);
      throw error;
    }
  }

  private mapPrismaEventToGoogleEvent(event: any): GoogleCalendarEvent {
    return {
      id: event.eventId,
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startDateTime,
        date: event.startDate,
        timeZone: event.timezone,
      },
      end: {
        dateTime: event.endDateTime,
        date: event.endDate,
        timeZone: event.timezone,
      },
      created: event.created,
      updated: event.updated,
      status: event.status,
      htmlLink: event.htmlLink,
    };
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default new DatabaseService();
