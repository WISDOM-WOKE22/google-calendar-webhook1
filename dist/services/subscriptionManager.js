"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = __importDefault(require("../utils/logger"));
const database_1 = __importDefault(require("./database"));
const googleCalendar_1 = __importDefault(require("./googleCalendar"));
class SubscriptionManager {
    constructor() {
        this.renewalJob = null;
    }
    startMonitoring() {
        // Check for expiring subscriptions every hour
        this.renewalJob = node_cron_1.default.schedule('0 * * * *', async () => {
            await this.checkAndRenewSubscriptions();
        });
        logger_1.default.info('Subscription monitoring started');
    }
    stopMonitoring() {
        if (this.renewalJob) {
            this.renewalJob.stop();
            this.renewalJob = null;
            logger_1.default.info('Subscription monitoring stopped');
        }
    }
    async checkAndRenewSubscriptions() {
        try {
            logger_1.default.info('Checking for expiring webhook subscriptions...');
            // Get subscriptions expiring in the next 24 hours
            const expiringSubscriptions = await database_1.default.getExpiringSubscriptions(24);
            if (expiringSubscriptions.length === 0) {
                logger_1.default.info('No subscriptions need renewal');
                return;
            }
            logger_1.default.info(`Found ${expiringSubscriptions.length} subscriptions that need renewal`);
            for (const subscription of expiringSubscriptions) {
                await this.renewSubscription(subscription);
            }
        }
        catch (error) {
            logger_1.default.error('Error checking and renewing subscriptions:', error);
        }
    }
    async renewSubscription(subscription) {
        try {
            logger_1.default.info(`Renewing subscription: ${subscription.subscription_id}`);
            const result = await googleCalendar_1.default.renewWebhookSubscription(subscription.subscription_id, subscription.resource_id);
            if (result.success) {
                logger_1.default.info(`Successfully renewed subscription: ${subscription.subscription_id}`);
            }
            else {
                logger_1.default.error(`Failed to renew subscription: ${subscription.subscription_id}`, result.error);
                // If renewal fails, try to create a new subscription
                await this.createNewSubscription();
            }
        }
        catch (error) {
            logger_1.default.error(`Error renewing subscription ${subscription.subscription_id}:`, error);
            // If renewal fails, try to create a new subscription
            await this.createNewSubscription();
        }
    }
    async createNewSubscription() {
        try {
            logger_1.default.info('Creating new webhook subscription...');
            const result = await googleCalendar_1.default.createWebhookSubscription();
            if (result.success) {
                logger_1.default.info('Successfully created new webhook subscription');
            }
            else {
                logger_1.default.error('Failed to create new webhook subscription:', result.error);
            }
        }
        catch (error) {
            logger_1.default.error('Error creating new webhook subscription:', error);
        }
    }
    async initializeSubscriptions() {
        try {
            logger_1.default.info('Initializing webhook subscriptions...');
            // Check if we have any active subscriptions
            const expiringSubscriptions = await database_1.default.getExpiringSubscriptions(24);
            if (expiringSubscriptions.length === 0) {
                // No active subscriptions, create a new one
                await this.createNewSubscription();
            }
            else {
                logger_1.default.info(`Found ${expiringSubscriptions.length} active subscriptions`);
            }
        }
        catch (error) {
            logger_1.default.error('Error initializing subscriptions:', error);
        }
    }
    async handleSubscriptionExpiration(subscriptionId) {
        try {
            logger_1.default.info(`Handling expiration for subscription: ${subscriptionId}`);
            // Try to renew the subscription
            const subscription = await database_1.default.getExpiringSubscriptions(0);
            const targetSubscription = subscription.find((sub) => sub.subscription_id === subscriptionId);
            if (targetSubscription) {
                await this.renewSubscription(targetSubscription);
            }
            else {
                // Subscription not found, create a new one
                await this.createNewSubscription();
            }
        }
        catch (error) {
            logger_1.default.error(`Error handling subscription expiration for ${subscriptionId}:`, error);
            await this.createNewSubscription();
        }
    }
    async handleNetworkFailure() {
        try {
            logger_1.default.info('Handling network failure during subscription renewal...');
            // Wait a bit before retrying
            await new Promise((resolve) => setTimeout(resolve, 5000));
            // Try to create a new subscription
            await this.createNewSubscription();
        }
        catch (error) {
            logger_1.default.error('Error handling network failure:', error);
        }
    }
}
exports.SubscriptionManager = SubscriptionManager;
exports.default = new SubscriptionManager();
