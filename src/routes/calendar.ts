import { Router } from 'express';
import {
  getEvents,
  pushWebhookNotification,
  createWebhookSubscription,
} from '../controllers/calendar';
import { protect } from '../middlewares/protect';

const router = Router();

// Public routes
router.route('/webhook/notification').post(pushWebhookNotification);

// Protected routes
// router.use(protect)

router.route('/events').get(getEvents);
router.route('/subscription').post(createWebhookSubscription);

export default router;
