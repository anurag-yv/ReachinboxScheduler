import axios from 'axios';
import {
  User,
  EmailJob,
  EmailSender,
  PaginatedResponse,
  SlackConnectionStatus,
  ScheduleEmailInput,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true, // Send HTTP-only session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthService = {
  async getMe(): Promise<{ user: User | null }> {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch {
      return { user: null };
    }
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout');
  },
};

export const EmailService = {
  async getScheduled(page: number = 1, limit: number = 10): Promise<PaginatedResponse<EmailJob>> {
    const response = await api.get('/api/emails/scheduled', {
      params: { page, limit },
    });
    return response.data;
  },

  async getSent(page: number = 1, limit: number = 10): Promise<PaginatedResponse<EmailJob>> {
    const response = await api.get('/api/emails/sent', {
      params: { page, limit },
    });
    return response.data;
  },

  async search(query: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<EmailJob>> {
    const response = await api.get('/api/emails/search', {
      params: { q: query, page, limit },
    });
    return response.data;
  },

  async schedule(input: ScheduleEmailInput): Promise<any> {
    if (input.file) {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('senderId', input.senderId);
      formData.append('subject', input.subject);
      formData.append('body', input.body);
      formData.append('startAt', input.startAt);
      formData.append('delaySeconds', input.delaySeconds.toString());
      formData.append('hourlyLimit', input.hourlyLimit.toString());

      const response = await api.post('/api/emails/schedule', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } else {
      const response = await api.post('/api/emails/schedule', {
        senderId: input.senderId,
        subject: input.subject,
        body: input.body,
        startAt: input.startAt,
        delaySeconds: input.delaySeconds,
        hourlyLimit: input.hourlyLimit,
        recipients: input.recipients || [],
      });
      return response.data;
    }
  },

  async clearHistory(): Promise<any> {
    const response = await api.delete('/api/emails/clear');
    return response.data;
  },
};

export const SenderService = {
  async list(): Promise<EmailSender[]> {
    const response = await api.get('/api/senders');
    return response.data.data;
  },

  async create(senderData: {
    name: string;
    email: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
  }): Promise<EmailSender> {
    const response = await api.post('/api/senders', senderData);
    return response.data.data;
  },
};

export const SlackService = {
  async getStatus(): Promise<SlackConnectionStatus> {
    const response = await api.get('/api/slack/connection');
    return response.data;
  },

  async disconnect(): Promise<void> {
    await api.delete('/api/slack/connection');
  },
};

export default api;
