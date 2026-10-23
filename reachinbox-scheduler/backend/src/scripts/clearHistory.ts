import { prisma } from '../config/prisma';
import { emailQueueService } from '../services/emailQueueService';

async function main() {
  console.log('Clearing all email jobs, schedules, and queue history...');

  try {
    const deletedJobs = await prisma.emailJob.deleteMany({});
    const deletedSchedules = await prisma.emailSchedule.deleteMany({});

    try {
      const rawQueue = emailQueueService.getRawQueue();
      await rawQueue.drain();
      await rawQueue.clean(0, 5000, 'completed');
      await rawQueue.clean(0, 5000, 'failed');
      await rawQueue.clean(0, 5000, 'delayed');
      await rawQueue.clean(0, 5000, 'wait');
    } catch (qErr: any) {
      console.warn('Queue drain warning:', qErr.message);
    }

    console.log(`Deleted: ${deletedJobs.count} jobs, ${deletedSchedules.count} schedules`);
    console.log('Tables and queues cleared.');
  } catch (err: any) {
    console.error('Failed to clear history:', err.message);
  } finally {
    process.exit(0);
  }
}

main();
