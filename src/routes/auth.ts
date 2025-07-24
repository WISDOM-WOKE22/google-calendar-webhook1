import { Router } from 'express';
import {
  getGoogleAuthUrl,
  handleGoogleAuthCallback,
} from '../controllers/auth';
const router = Router();

router.route('/google/url').get(getGoogleAuthUrl);
router.route('/google/callback').post(handleGoogleAuthCallback);

export default router;
