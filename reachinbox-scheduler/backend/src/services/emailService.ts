import { prisma } from '../config/prisma';
import { IEmailQueueService, ISearchService } from '../types';
import { emailQueueService } from './emailQueueService';
import { searchService } from './searchService';

export interface ScheduleEmailsInput {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: Date;
  delaySeconds: number;
  hourlyLimit: number;
}

export class EmailService {
  private queueService: IEmailQueueService;
  private searchService: ISearchService;

  constructor(
    queueService: IEmailQueueService = emailQueueService,
    searchServiceInstance: ISearchService = searchService
  ) {
    this.queueService = queueService;
    this.searchService = searchServiceInstance;
  }

  // schedule email campaign and enqueue delayed jobs
  async scheduleCampaign(input: ScheduleEmailsInput) {
    const {
      userId,
      senderId,
      subject,
      body,
      recipients,
      startAt,
      delaySeconds,
      hourlyLimit,
    } = input;

    if (recipients.length === 0) {
      throw new Error('At least one valid recipient is required');
    }

    const sender = await prisma.emailSender.findFirst({
      where: { id: senderId, userId },
    });

    if (!sender) {
      throw new Error('Sender not found or not owned by user');
    }

    const startTimestamp = startAt.getTime();
    const delayMs = delaySeconds * 1000;

    // save schedule in db
    const schedule = await prisma.emailSchedule.create({
      data: {
        userId,
        subject,
        body,
        startAt,
        delaySeconds,
        hourlyLimit,
      },
    });

    // prepare jobs with staggered timestamps
    const jobsToCreate = recipients.map((recipient, index) => {
      const scheduledTime = new Date(startTimestamp + index * delayMs);
      return {
        scheduleId: schedule.id,
        userId,
        senderId,
        recipient,
        subject,
        body,
        scheduledAt: scheduledTime,
        status: 'scheduled',
      };
    });

    // bulk insert jobs
    await prisma.emailJob.createMany({
      data: jobsToCreate,
    });

    const createdJobs = await prisma.emailJob.findMany({
      where: { scheduleId: schedule.id },
      orderBy: { scheduledAt: 'asc' },
    });

    const now = Date.now();

    // add delayed jobs to bullmq
    for (const job of createdJobs) {
      const targetTime = job.scheduledAt.getTime();
      const delayForJob = Math.max(0, targetTime - now);

      await this.queueService.addDelayedJob(job.id, delayForJob, {
        jobId: job.id,
        userId: job.userId,
        senderId: job.senderId,
        scheduleId: job.scheduleId,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
      });

      // Index initial job document in Elasticsearch asynchronously
      this.searchService.indexEmailJob({
        id: job.id,
        userId: job.userId,
        scheduleId: job.scheduleId,
        senderId: job.senderId,
        recipient: job.recipient,
        subject: job.subject,
        body: job.body,
        status: 'scheduled',
        scheduledAt: job.scheduledAt.toISOString(),
      }).catch((err) => {
        console.warn(`[EmailService] Search index error for job ${job.id}:`, err.message);
      });
    }

    return {
      scheduleId: schedule.id,
      totalScheduled: createdJobs.length,
      startAt,
      firstScheduledAt: createdJobs[0]?.scheduledAt,
      lastScheduledAt: createdJobs[createdJobs.length - 1]?.scheduledAt,
    };
  }
}

export const emailService = new EmailService();
