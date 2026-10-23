import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { emailService } from '../services/emailService';
import { RecipientParser } from '../services/recipientParser';
import { searchService } from '../services/searchService';

export class EmailController {
  /**
   * Schedule new outreach campaign
   * POST /api/emails/schedule
   */
  public static async schedule(req: Request, res: Response) {
    try {
      const { senderId, subject, body, startAt, delaySeconds = 2, hourlyLimit = 100 } = req.body;
      let rawRecipients: string[] = [];
      let parseStats = {
        validRecipients: [] as string[],
        invalidEntriesCount: 0,
        duplicateCount: 0,
        totalParsed: 0,
      };

      // Read from uploaded CSV / TXT or text field
      if (req.file) {
        parseStats = RecipientParser.parseFile(req.file.buffer);
        rawRecipients = parseStats.validRecipients;
      } else if (req.body.recipients) {
        const input = Array.isArray(req.body.recipients)
          ? req.body.recipients.join('\n')
          : req.body.recipients;
        parseStats = RecipientParser.parseFile(input);
        rawRecipients = parseStats.validRecipients;
      }

      if (rawRecipients.length === 0) {
        return res.status(400).json({
          error: 'No valid recipient email addresses found.',
        });
      }

      const result = await emailService.scheduleCampaign({
        userId: req.user!.userId,
        senderId,
        subject,
        body,
        recipients: rawRecipients,
        startAt: new Date(startAt),
        delaySeconds: Number(delaySeconds) || 2,
        hourlyLimit: Number(hourlyLimit) || 100,
      });

      return res.status(201).json({
        success: true,
        message: `Successfully scheduled ${result.totalScheduled} email(s)`,
        data: result,
      });
    } catch (err: any) {
      console.error('[EmailController.schedule]', err);
      return res.status(500).json({ error: err.message || 'Scheduling failed' });
    }
  }

  /**
   * Get scheduled emails
   * GET /api/emails/scheduled
   */
  public static async getScheduled(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const where = {
        userId: req.user!.userId,
        status: { in: ['scheduled', 'processing'] },
      };

      const [total, items] = await Promise.all([
        prisma.emailJob.count({ where }),
        prisma.emailJob.findMany({
          where,
          include: { sender: { select: { name: true, email: true } } },
          orderBy: { scheduledAt: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return res.json({
        data: items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
    }
  }

  /**
   * Get sent / failed emails
   * GET /api/emails/sent
   */
  public static async getSent(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const where = {
        userId: req.user!.userId,
        status: { in: ['sent', 'failed'] },
      };

      const [total, items] = await Promise.all([
        prisma.emailJob.count({ where }),
        prisma.emailJob.findMany({
          where,
          include: { sender: { select: { name: true, email: true } } },
          orderBy: { sentAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return res.json({
        data: items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch sent emails' });
    }
  }

  /**
   * Search emails
   * GET /api/emails/search?q=...
   */
  public static async search(req: Request, res: Response) {
    try {
      const q = String(req.query.q || '');
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const result = await searchService.searchEmails(req.user!.userId, q, page, limit);

      return res.json({
        query: q,
        data: result.hits,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Search failed', message: err.message });
    }
  }

  /**
   * Clear all email history & queues
   * DELETE /api/emails/clear
   */
  public static async clearHistory(req: Request, res: Response) {
    try {
      await prisma.emailJob.deleteMany({});
      await prisma.emailSchedule.deleteMany({});

      try {
        const { emailQueueService } = await import('../services/emailQueueService');
        const queue = emailQueueService.getRawQueue();
        await queue.drain();
        await queue.clean(0, 5000, 'completed');
        await queue.clean(0, 5000, 'failed');
        await queue.clean(0, 5000, 'delayed');
        await queue.clean(0, 5000, 'wait');
      } catch {}

      return res.json({ success: true, message: 'All history cleared' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to clear history' });
    }
  }

  /**
   * Get single email by ID
   * GET /api/emails/:id
   */
  public static async getById(req: Request, res: Response) {
    try {
      const email = await prisma.emailJob.findFirst({
        where: { id: req.params.id, userId: req.user!.userId },
        include: {
          sender: { select: { name: true, email: true } },
          schedule: true,
        },
      });

      if (!email) return res.status(404).json({ error: 'Email not found' });
      return res.json({ data: email });
    } catch {
      return res.status(500).json({ error: 'Failed to fetch email' });
    }
  }
}
