import axios from 'axios';
import { ISlackService, HourlyLimitAlert } from '../types';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { CryptoService } from './cryptoService';
import { redisClient } from '../config/redis';

export class SlackService implements ISlackService {
  /**
   * Generates real Slack OAuth authorization URL with CSRF state token
   */
  public static getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: ENV.SLACK_CLIENT_ID,
      scope: 'chat:write,chat:write.public',
      redirect_uri: ENV.SLACK_REDIRECT_URI,
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for bot access token with Slack API
   */
  public static async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    teamId?: string;
    teamName?: string;
  }> {
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: ENV.SLACK_CLIENT_ID,
        client_secret: ENV.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: ENV.SLACK_REDIRECT_URI,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (!response.data.ok) {
      throw new Error(`Slack OAuth error: ${response.data.error || 'Unknown error'}`);
    }

    return {
      accessToken: response.data.access_token,
      teamId: response.data.team?.id,
      teamName: response.data.team?.name,
    };
  }

  /**
   * Sends an hourly quota alert notification to the user's connected Slack workspace.
   * Deduplicates per sender and UTC hour window using Redis.
   */
  async sendHourlyLimitAlert(alert: HourlyLimitAlert): Promise<boolean> {
    const dedupeKey = `slack-notified:${alert.senderId}:${alert.windowUtc}`;

    try {
      // Deduplicate alert: check if already notified in this window
      const wasNotified = await redisClient.get(dedupeKey);
      if (wasNotified) {
        return false;
      }

      // Check if user has an active Slack connection
      const connection = await prisma.slackConnection.findUnique({
        where: { userId: alert.userId },
      });

      if (!connection || !connection.enabled || !connection.accessTokenEncrypted) {
        // Slack not connected; schedule continues smoothly
        return false;
      }

      const token = CryptoService.decrypt(connection.accessTokenEncrypted);
      if (!token) {
        console.warn(`[SlackService] Could not decrypt token for user ${alert.userId}`);
        return false;
      }

      // Format Slack Block Kit message
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'ReachInbox: Hourly Email Quota Reached',
            emoji: false,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n${alert.senderName} (${alert.senderEmail})`,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Quota:*\n${alert.hourlyQuota} emails/hour`,
            },
            {
              type: 'mrkdwn',
              text: `*UTC Window:*\n${alert.windowUtc}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nRemaining jobs safely deferred to next window.`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Rate limit enforced. No emails dropped or failed.',
            },
          ],
        },
      ];

      const postResponse = await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: '#general', // Posts to #general or default public channel
          blocks,
          text: `ReachInbox Alert: Sender ${alert.senderEmail} reached hourly limit of ${alert.hourlyQuota}. Jobs deferred.`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );

      if (!postResponse.data.ok) {
        console.warn('[SlackService] Slack postMessage failed:', postResponse.data.error);
        if (postResponse.data.error === 'token_revoked' || postResponse.data.error === 'invalid_auth') {
          // Disable invalid connection
          await prisma.slackConnection.update({
            where: { userId: alert.userId },
            data: { enabled: false },
          });
        }
        return false;
      }

      // Mark as notified for this window (expires in 2 hours)
      await redisClient.set(dedupeKey, '1', 'EX', 7200);
      console.log(`[SlackService] Hourly limit alert sent to Slack for sender ${alert.senderEmail}`);
      return true;
    } catch (err: any) {
      console.error('[SlackService] Error sending Slack notification:', err.message);
      return false;
    }
  }
}

export const slackService = new SlackService();
