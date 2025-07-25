"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../utils/logger"));
const prisma_1 = __importDefault(require("./prisma"));
class DatabaseService {
    constructor() {
        this.prisma = prisma_1.default;
    }
    // Removed buggy createEvent (wrong model name)
    // Use saveEvent for event creation/upsert
    async initalizeDatabase() {
        try {
            await this.prisma.$connect();
            logger_1.default.info('Database connected successfully');
        }
        catch (error) {
            logger_1.default.error('Error connecting to database', error);
            throw error;
        }
    }
    async saveEvent(event) {
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
        }
        catch (error) {
            logger_1.default.error('Failed to save event:', error);
            throw error;
        }
    }
    async updateEvent(event) {
        await this.saveEvent(event);
    }
    async deleteEvent(eventId) {
        try {
            await this.prisma.calendarEvent.update({
                where: { eventId },
                data: { deletedAt: new Date().toISOString() },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to delete event:', error);
            throw error;
        }
    }
    async getEvents(startTime, endTime) {
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
        }
        catch (error) {
            logger_1.default.error('Failed to get events:', error);
            throw error;
        }
    }
    async isTimeRangeCached(startTime, endTime) {
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
        }
        catch (error) {
            logger_1.default.error('Failed to check cache:', error);
            return false;
        }
    }
    async cacheTimeRange(startTime, endTime) {
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
        }
        catch (error) {
            logger_1.default.error('Failed to cache time range:', error);
            throw error;
        }
    }
    async saveSubscription(subscription) {
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
        }
        catch (error) {
            logger_1.default.error('Failed to save subscription:', error);
            throw error;
        }
    }
    async getExpiringSubscriptions(hoursBeforeExpiration = 24) {
        try {
            const expirationThreshold = new Date();
            expirationThreshold.setHours(expirationThreshold.getHours() + hoursBeforeExpiration);
            return await this.prisma.webhookSubscription.findMany({
                where: {
                    expiration: {
                        lte: expirationThreshold.toISOString(),
                    },
                    state: 'active',
                },
                orderBy: { expiration: 'asc' },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to get expiring subscriptions:', error);
            throw error;
        }
    }
    async updateSubscriptionExpiration(subscriptionId, newExpiration) {
        try {
            await this.prisma.webhookSubscription.update({
                where: { subscriptionId },
                data: {
                    expiration: newExpiration,
                    updated: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to update subscription expiration:', error);
            throw error;
        }
    }
    async deleteExpiredSubscriptions() {
        try {
            await this.prisma.webhookSubscription.deleteMany({
                where: {
                    expiration: {
                        lte: new Date().toISOString(),
                    },
                    state: 'active', // Fix: state must be inside where
                },
            });
        }
        catch (error) {
            logger_1.default.error('Failed to delete expired subscriptions:', error);
            throw error;
        }
    }
    mapPrismaEventToGoogleEvent(event) {
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
    async close() {
        await this.prisma.$disconnect();
    }
}
exports.default = new DatabaseService();
