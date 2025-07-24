import cron from 'node-cron';
import logger from '../utils/logger';
import databaseService from './database';
import googleCalendarService from './googleCalendar';
import { SubscriptionRenewalResult } from '../types';

export class SubscriptionManager {
  private renewalJob: import('node-cron').ScheduledTask | null = null;

  startMonitoring(): void {
    // Check for expiring subscriptions every hour
    this.renewalJob = cron.schedule('0 * * * *', async () => {
      await this.checkAndRenewSubscriptions();
    });

    logger.info('Subscription monitoring started');
  }

  stopMonitoring(): void {
    if (this.renewalJob) {
      this.renewalJob.stop();
      this.renewalJob = null;
      logger.info('Subscription monitoring stopped');
    }
  }

  async checkAndRenewSubscriptions(): Promise<void> {
    try {
      logger.info('Checking for expiring webhook subscriptions...');

      // Get subscriptions expiring in the next 24 hours
      const expiringSubscriptions =
        await databaseService.getExpiringSubscriptions(24);

      if (expiringSubscriptions.length === 0) {
        logger.info('No subscriptions need renewal');
        return;
      }

      logger.info(
        `Found ${expiringSubscriptions.length} subscriptions that need renewal`,
      );

      for (const subscription of expiringSubscriptions) {
        await this.renewSubscription(subscription);
      }
    } catch (error) {
      logger.error('Error checking and renewing subscriptions:', error);
    }
  }

  private async renewSubscription(subscription: any): Promise<void> {
    try {
      logger.info(`Renewing subscription: ${subscription.subscription_id}`);

      const result: SubscriptionRenewalResult =
        await googleCalendarService.renewWebhookSubscription(
          subscription.subscription_id,
          subscription.resource_id,
        );

      if (result.success) {
        logger.info(
          `Successfully renewed subscription: ${subscription.subscription_id}`,
        );
      } else {
        logger.error(
          `Failed to renew subscription: ${subscription.subscription_id}`,
          result.error,
        );

        // If renewal fails, try to create a new subscription
        await this.createNewSubscription();
      }
    } catch (error) {
      logger.error(
        `Error renewing subscription ${subscription.subscription_id}:`,
        error,
      );

      // If renewal fails, try to create a new subscription
      await this.createNewSubscription();
    }
  }

  private async createNewSubscription(): Promise<void> {
    try {
      logger.info('Creating new webhook subscription...');

      const result = await googleCalendarService.createWebhookSubscription();

      if (result.success) {
        logger.info('Successfully created new webhook subscription');
      } else {
        logger.error(
          'Failed to create new webhook subscription:',
          result.error,
        );
      }
    } catch (error) {
      logger.error('Error creating new webhook subscription:', error);
    }
  }

  async initializeSubscriptions(): Promise<void> {
    try {
      logger.info('Initializing webhook subscriptions...');

      // Check if we have any active subscriptions
      const expiringSubscriptions =
        await databaseService.getExpiringSubscriptions(24);

      if (expiringSubscriptions.length === 0) {
        // No active subscriptions, create a new one
        await this.createNewSubscription();
      } else {
        logger.info(
          `Found ${expiringSubscriptions.length} active subscriptions`,
        );
      }
    } catch (error) {
      logger.error('Error initializing subscriptions:', error);
    }
  }

  async handleSubscriptionExpiration(subscriptionId: string): Promise<void> {
    try {
      logger.info(`Handling expiration for subscription: ${subscriptionId}`);

      // Try to renew the subscription
      const subscription = await databaseService.getExpiringSubscriptions(0);
      const targetSubscription = subscription.find(
        (sub) => sub.subscription_id === subscriptionId,
      );

      if (targetSubscription) {
        await this.renewSubscription(targetSubscription);
      } else {
        // Subscription not found, create a new one
        await this.createNewSubscription();
      }
    } catch (error) {
      logger.error(
        `Error handling subscription expiration for ${subscriptionId}:`,
        error,
      );
      await this.createNewSubscription();
    }
  }

  async handleNetworkFailure(): Promise<void> {
    try {
      logger.info('Handling network failure during subscription renewal...');

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Try to create a new subscription
      await this.createNewSubscription();
    } catch (error) {
      logger.error('Error handling network failure:', error);
    }
  }
}

export default new SubscriptionManager();
