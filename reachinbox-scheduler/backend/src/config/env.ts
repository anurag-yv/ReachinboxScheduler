import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  SESSION_SECRET: process.env.SESSION_SECRET || 'reachinbox_default_secret_key_minimum_32_chars_long!',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 32 bytes hex
  ETHEREAL_HOST: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
  ETHEREAL_PORT: parseInt(process.env.ETHEREAL_PORT || '587', 10),
  ETHEREAL_USER: process.env.ETHEREAL_USER || '',
  ETHEREAL_PASSWORD: process.env.ETHEREAL_PASSWORD || '',
  DEFAULT_SENDER_EMAIL: process.env.DEFAULT_SENDER_EMAIL || 'outreach@demo.reachinbox.ai',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
  MIN_DELAY_BETWEEN_EMAILS_SECONDS: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_SECONDS || '2', 10),
  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100', 10),
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  ELASTICSEARCH_USERNAME: process.env.ELASTICSEARCH_USERNAME || '',
  ELASTICSEARCH_PASSWORD: process.env.ELASTICSEARCH_PASSWORD || '',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:4000/api/slack/callback',
};
