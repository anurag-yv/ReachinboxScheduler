import { Request, Response } from 'express';
import crypto from 'crypto';
import { SlackService } from '../services/slackService';
import { prisma } from '../config/prisma';
import { CryptoService } from '../services/cryptoService';
import { ENV } from '../config/env';

export class SlackController {
  /**
   * Initiates Slack OAuth redirect
   * GET /api/slack/connect
   */
  public static async connect(req: Request, res: Response) {
    try {
      if (!ENV.SLACK_CLIENT_ID || !ENV.SLACK_CLIENT_SECRET) {
        return res.status(500).json({
          error: 'Slack Integration Not Configured',
          message:
            'Please configure SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env to connect Slack notifications.',
        });
      }

      const state = crypto.randomBytes(16).toString('hex');
      res.cookie('slack_oauth_state', state, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });

      const redirectUrl = SlackService.getAuthorizationUrl(state);
      return res.redirect(redirectUrl);
    } catch (err: any) {
      console.error('[SlackController.connect]', err);
      return res.status(500).json({ error: 'Failed to initiate Slack authorization' });
    }
  }

  /**
   * Handles Slack OAuth callback
   * GET /api/slack/callback
   */
  public static async callback(req: Request, res: Response) {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${ENV.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(String(error))}`
      );
    }

    const savedState = req.cookies?.slack_oauth_state;
    if (!state || !savedState || state !== savedState) {
      return res.redirect(
        `${ENV.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent('Invalid OAuth state parameter')}`
      );
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${ENV.FRONTEND_URL}/dashboard?slack_error=missing_code`);
    }

    try {
      res.clearCookie('slack_oauth_state');
      const tokenData = await SlackService.exchangeCodeForToken(code);

      // Check current session
      const sessionToken = req.cookies?.reachinbox_session;
      const userPayload = sessionToken ? require('../services/authService').AuthService.verifySessionToken(sessionToken) : null;

      if (!userPayload) {
        return res.redirect(`${ENV.FRONTEND_URL}/login?error=session_expired_during_slack_auth`);
      }

      const encryptedToken = CryptoService.encrypt(tokenData.accessToken);

      await prisma.slackConnection.upsert({
        where: { userId: userPayload.userId },
        update: {
          teamId: tokenData.teamId || null,
          accessTokenEncrypted: encryptedToken,
          enabled: true,
        },
        create: {
          userId: userPayload.userId,
          teamId: tokenData.teamId || null,
          accessTokenEncrypted: encryptedToken,
          enabled: true,
        },
      });

      return res.redirect(`${ENV.FRONTEND_URL}/dashboard?slack=connected`);
    } catch (err: any) {
      console.error('[SlackController.callback]', err);
      return res.redirect(
        `${ENV.FRONTEND_URL}/dashboard?slack_error=${encodeURIComponent(err.message || 'Slack connection failed')}`
      );
    }
  }

  /**
   * Get current user's Slack connection status
   * GET /api/slack/connection
   */
  public static async getConnection(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const connection = await prisma.slackConnection.findUnique({
        where: { userId },
        select: {
          id: true,
          teamId: true,
          enabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.json({
        connected: !!connection && connection.enabled,
        connection: connection || null,
      });
    } catch (err: any) {
      console.error('[SlackController.getConnection]', err);
      return res.status(500).json({ error: 'Failed to retrieve Slack status' });
    }
  }

  /**
   * Disconnect Slack integration
   * DELETE /api/slack/connection
   */
  public static async disconnect(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      await prisma.slackConnection.deleteMany({
        where: { userId },
      });

      return res.json({
        success: true,
        message: 'Slack integration disconnected successfully',
      });
    } catch (err: any) {
      console.error('[SlackController.disconnect]', err);
      return res.status(500).json({ error: 'Failed to disconnect Slack' });
    }
  }
}
