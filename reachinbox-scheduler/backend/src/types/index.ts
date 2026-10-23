export type EmailJobStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
}

export interface EmailSendResult {
  messageId: string;
  previewUrl?: string;
}

// O - Open/Closed & I - Interface Segregation
export interface IEmailSender {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

// Interface for Email Queue
export interface QueueJobData {
  jobId: string;
  userId: string;
  senderId: string;
  scheduleId: string;
  recipient: string;
  subject: string;
  body: string;
}

export interface IEmailQueueService {
  addDelayedJob(emailJobId: string, delayMs: number, data: QueueJobData): Promise<void>;
  hasJob(emailJobId: string): Promise<boolean>;
  getQueueMetrics(): Promise<{
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  }>;
}

// Interface for Distributed Rate Limiting
export interface RateLimitReservationResult {
  allowed: boolean;
  delayMs: number;
}

export interface HourlyQuotaResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfterSeconds: number;
  windowKey: string;
}

export interface IRateLimitService {
  reserveSendSpacing(senderId: string, minDelaySeconds: number): Promise<RateLimitReservationResult>;
  checkAndConsumeHourlyQuota(senderId: string, hourlyLimit: number): Promise<HourlyQuotaResult>;
}

// Interface for Elasticsearch Search
export interface EmailIndexDocument {
  id: string;
  userId: string;
  scheduleId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailJobStatus;
  scheduledAt: string;
  sentAt?: string | null;
  errorMessage?: string | null;
}

export interface ISearchService {
  initIndex(): Promise<void>;
  indexEmailJob(doc: EmailIndexDocument): Promise<void>;
  searchEmails(userId: string, query: string, page?: number, limit?: number): Promise<{
    total: number;
    hits: EmailIndexDocument[];
  }>;
}

// Interface for Slack Notifications
export interface HourlyLimitAlert {
  userId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  hourlyQuota: number;
  windowUtc: string;
  deferredCount?: number;
}

export interface ISlackService {
  sendHourlyLimitAlert(alert: HourlyLimitAlert): Promise<boolean>;
}

// User Session Auth Payload
export interface AuthUserPayload {
  userId: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}
