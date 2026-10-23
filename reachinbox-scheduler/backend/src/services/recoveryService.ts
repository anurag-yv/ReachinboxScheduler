import { prisma } from '../config/prisma';
import { emailQueueService } from './emailQueueService';

// syncs pending db jobs into bullmq on startup
export class RecoveryService {
  public static async reconcilePendingJobs(): Promise<{
    checked: number;
    reconciled: number;
  }> {
    console.log('[RecoveryService] Starting reconciliation check for pending email jobs...');

    let checkedCount = 0;
    let reconciledCount = 0;

    try {
      // Find all scheduled or processing jobs that have not been sent yet
      const pendingJobs = await prisma.emailJob.findMany({
        where: {
          status: { in: ['scheduled', 'processing'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 500, // Batch limit for safe startup performance
      });

      checkedCount = pendingJobs.length;

      for (const job of pendingJobs) {
        // If job status was stuck in 'processing' due to worker crash, revert to 'scheduled'
        if (job.status === 'processing') {
          await prisma.emailJob.update({
            where: { id: job.id },
            data: { status: 'scheduled' },
          });
        }

        // Check if the deterministic job already exists in BullMQ
        const existsInQueue = await emailQueueService.hasJob(job.id);

        if (!existsInQueue) {
          const now = Date.now();
          const targetTime = job.scheduledAt.getTime();
          const remainingDelayMs = Math.max(0, targetTime - now);

          await emailQueueService.addDelayedJob(job.id, remainingDelayMs, {
            jobId: job.id,
            userId: job.userId,
            senderId: job.senderId,
            scheduleId: job.scheduleId,
            recipient: job.recipient,
            subject: job.subject,
            body: job.body,
          });

          reconciledCount++;
        }
      }

      console.log(
        `[RecoveryService] Reconciliation completed. Checked: ${checkedCount}, Re-enqueued missing: ${reconciledCount}`
      );
    } catch (err: any) {
      console.warn('[RecoveryService] Reconciliation warning (e.g. DB or Redis offline):', err.message);
    }

    return { checked: checkedCount, reconciled: reconciledCount };
  }
}
