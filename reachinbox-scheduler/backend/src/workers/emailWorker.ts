import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, emailQueueService } from '../services/emailQueueService';
import { QueueJobData } from '../types';
import { createRedisConnection } from '../config/redis';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { NodemailerEmailSender } from '../services/emailSender';
import { RedisRateLimitService } from '../services/rateLimitService';
import { SlackService } from '../services/slackService';
import { searchService } from '../services/searchService';
import { CryptoService } from '../services/cryptoService';
import { RecoveryService } from '../services/recoveryService';

const rateLimitService = new RedisRateLimitService();
const slackService = new SlackService();

// Worker to process email queue jobs
export const startEmailWorker = () => {
  const connection = createRedisConnection();

  console.log(`[EmailWorker] Starting BullMQ Worker with concurrency = ${ENV.WORKER_CONCURRENCY}...`);

  const worker = new Worker<QueueJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<QueueJobData>) => {
      const { jobId, userId, senderId, recipient, subject, body } = job.data;

      // check if job exists in db
      const emailRecord = await prisma.emailJob.findUnique({
        where: { id: jobId },
        include: { schedule: true, sender: true },
      });

      if (!emailRecord) {
        console.warn(`[EmailWorker] Job record ${jobId} not found in database. Skipping.`);
        return;
      }

      // skip if already sent
      if (emailRecord.status === 'sent') {
        console.log(`[EmailWorker] Job ${jobId} already marked sent in database. Skipping.`);
        return;
      }

      // mark processing
      await prisma.emailJob.update({
        where: { id: jobId },
        data: { status: 'processing' },
      });

      // check hourly rate limit
      const hourlyLimit = emailRecord.schedule.hourlyLimit || ENV.MAX_EMAILS_PER_HOUR_PER_SENDER;
      const quotaResult = await rateLimitService.checkAndConsumeHourlyQuota(senderId, hourlyLimit);

      if (!quotaResult.allowed) {
        const deferredUntil = new Date(Date.now() + quotaResult.retryAfterSeconds * 1000);
        console.warn(
          `[EmailWorker] Hourly quota reached for sender ${emailRecord.sender.email} (${quotaResult.currentCount}/${hourlyLimit}). Deferring job ${jobId} by ${quotaResult.retryAfterSeconds}s to ${deferredUntil.toISOString()}`
        );

        // reschedule for next hour
        await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'scheduled',
            scheduledAt: deferredUntil,
          },
        });

        // send slack alert if connected
        slackService
          .sendHourlyLimitAlert({
            userId,
            senderId,
            senderEmail: emailRecord.sender.email,
            senderName: emailRecord.sender.name,
            hourlyQuota: hourlyLimit,
            windowUtc: quotaResult.windowKey.split(':')[2] || 'Current Window',
          })
          .catch((err) => {
            console.warn('[EmailWorker] Slack alert warning:', err.message);
          });

        await emailQueueService.addDelayedJob(
          jobId,
          quotaResult.retryAfterSeconds * 1000,
          job.data
        );

        return;
      }

      // send spacing delay
      const minDelaySeconds = emailRecord.schedule.delaySeconds || ENV.MIN_DELAY_BETWEEN_EMAILS_SECONDS;
      const spacingResult = await rateLimitService.reserveSendSpacing(senderId, minDelaySeconds);

      if (!spacingResult.allowed && spacingResult.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, spacingResult.delayMs));
      }

      let smtpPass = ENV.ETHEREAL_PASSWORD;
      if (emailRecord.sender.smtpPasswordEncrypted) {
        smtpPass = CryptoService.decrypt(emailRecord.sender.smtpPasswordEncrypted);
      }

      const senderInstance = new NodemailerEmailSender({
        host: emailRecord.sender.smtpHost || ENV.ETHEREAL_HOST,
        port: emailRecord.sender.smtpPort || ENV.ETHEREAL_PORT,
        user: emailRecord.sender.smtpUser || ENV.ETHEREAL_USER,
        pass: smtpPass,
        fromEmail: emailRecord.sender.email,
        fromName: emailRecord.sender.name,
      });

      // send email
      try {
        const result = await senderInstance.send({
          to: recipient,
          subject,
          body,
          fromName: emailRecord.sender.name,
          fromEmail: emailRecord.sender.email,
        });

        const sentTime = new Date();

        // mark sent in db
        await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'sent',
            sentAt: sentTime,
            errorMessage: null,
          },
        });

        searchService
          .indexEmailJob({
            id: jobId,
            userId,
            scheduleId: emailRecord.scheduleId,
            senderId,
            recipient,
            subject,
            body,
            status: 'sent',
            scheduledAt: emailRecord.scheduledAt.toISOString(),
            sentAt: sentTime.toISOString(),
          })
          .catch(() => {});

        console.log(`[EmailWorker] Successfully sent email to ${recipient}. Result MessageId: ${result.messageId}`);
      } catch (err: any) {
        console.error(`[EmailWorker] Failed sending email to ${recipient}:`, err.message);

        // Update database with failure info
        await prisma.emailJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorMessage: err.message || 'SMTP sending error',
          },
        });

        searchService
          .indexEmailJob({
            id: jobId,
            userId,
            scheduleId: emailRecord.scheduleId,
            senderId,
            recipient,
            subject,
            body,
            status: 'failed',
            scheduledAt: emailRecord.scheduledAt.toISOString(),
            errorMessage: err.message,
          })
          .catch(() => {});

        throw err; // Let BullMQ handle bounded retry if configured
      }
    },
    {
      connection,
      concurrency: ENV.WORKER_CONCURRENCY,
    }
  );

  worker.on('ready', () => {
    console.log('[EmailWorker] BullMQ Worker is ready and listening for jobs.');
  });

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed with error:`, err.message);
  });

  worker.on('error', (err) => {
    if ((err as any).code !== 'ECONNREFUSED') {
      console.error('[EmailWorker] Worker connection error:', err.message);
    }
  });

  return worker;
};

// If executed directly as standalone process
if (require.main === module) {
  // Reconcile pending jobs on worker startup
  RecoveryService.reconcilePendingJobs()
    .then(() => {
      startEmailWorker();
    })
    .catch((err) => {
      console.error('[EmailWorker] Startup reconciliation failed:', err.message);
      startEmailWorker();
    });
}
