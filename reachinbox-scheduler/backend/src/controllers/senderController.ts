import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { CryptoService } from '../services/cryptoService';

const CreateSenderSchema = z.object({
  name: z.string().min(1, 'Sender name is required'),
  email: z.string().email('Valid sender email required'),
  smtpHost: z.string().default('smtp.ethereal.email'),
  smtpPort: z.coerce.number().default(587),
  smtpUser: z.string().default(''),
  smtpPassword: z.string().optional(),
});

export class SenderController {
  /**
   * List all configured senders for authenticated user
   * GET /api/senders
   */
  public static async list(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const senders = await prisma.emailSender.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          email: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.json({ data: senders });
    } catch (err: any) {
      console.error('[SenderController.list]', err);
      return res.status(500).json({ error: 'Failed to retrieve senders' });
    }
  }

  /**
   * Create a new email sender
   * POST /api/senders
   */
  public static async create(req: Request, res: Response) {
    try {
      const parsed = CreateSenderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation Error',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.userId;
      const { name, email, smtpHost, smtpPort, smtpUser, smtpPassword } = parsed.data;

      const encryptedPassword = smtpPassword ? CryptoService.encrypt(smtpPassword) : '';

      const sender = await prisma.emailSender.create({
        data: {
          userId,
          name,
          email,
          smtpHost,
          smtpPort,
          smtpUser: smtpUser || email,
          smtpPasswordEncrypted: encryptedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          smtpHost: true,
          smtpPort: true,
          createdAt: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Sender added successfully',
        data: sender,
      });
    } catch (err: any) {
      console.error('[SenderController.create]', err);
      return res.status(500).json({ error: 'Failed to create sender' });
    }
  }
}
