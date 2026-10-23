import { Router } from 'express';
import multer from 'multer';
import { EmailController } from '../controllers/emailController';
import { requireAuth } from '../middleware/authMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

const router = Router();

// Protect all email endpoints with requireAuth
router.use(requireAuth);

router.post('/schedule', upload.single('file'), EmailController.schedule);
router.get('/scheduled', EmailController.getScheduled);
router.get('/sent', EmailController.getSent);
router.get('/search', EmailController.search);
router.delete('/clear', EmailController.clearHistory);
router.get('/:id', EmailController.getById);

export default router;
