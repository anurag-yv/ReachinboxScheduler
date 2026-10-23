import { Router } from 'express';
import { SlackController } from '../controllers/slackController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/connect', requireAuth, SlackController.connect);
router.get('/callback', SlackController.callback);
router.get('/connection', requireAuth, SlackController.getConnection);
router.delete('/connection', requireAuth, SlackController.disconnect);

export default router;
