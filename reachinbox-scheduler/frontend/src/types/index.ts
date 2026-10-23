export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface User {
  userId: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface EmailSender {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser?: string;
  createdAt: string;
}

export interface EmailJob {
  id: string;
  scheduleId: string;
  userId: string;
  senderId: string;
  sender?: {
    name: string;
    email: string;
  };
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SlackConnectionStatus {
  connected: boolean;
  connection: {
    id: string;
    teamId?: string | null;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface ScheduleEmailInput {
  senderId: string;
  subject: string;
  body: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  recipients?: string[];
  file?: File;
}

export interface ScheduleResult {
  scheduleId: string;
  totalScheduled: number;
  startAt: string;
  recipientStats: {
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    totalSubmitted: number;
  };
}
