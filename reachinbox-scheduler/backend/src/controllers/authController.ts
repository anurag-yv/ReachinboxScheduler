import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthService } from '../services/authService';
import { ENV } from '../config/env';

export class AuthController {
  /**
   * Redirects user to Google OAuth consent screen
   * GET /api/auth/google
   */
  public static async googleLogin(req: Request, res: Response) {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      // Store state in signed/httpOnly cookie to prevent CSRF
      res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000, // 10 minutes
      });

      const authUrl = AuthService.getGoogleAuthUrl(state);
      return res.redirect(authUrl);
    } catch (err: any) {
      console.error('[AuthController.googleLogin]', err.message);
      return res.status(500).json({
        error: 'Google OAuth Configuration Error',
        message: err.message,
      });
    }
  }

  /**
   * Handles Google OAuth callback and sets session cookie
   * GET /api/auth/google/callback
   */
  public static async googleCallback(req: Request, res: Response) {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${ENV.FRONTEND_URL}/login?error=${encodeURIComponent(String(error))}`);
    }

    const savedState = req.cookies?.oauth_state;
    if (!state || !savedState || state !== savedState) {
      return res.redirect(
        `${ENV.FRONTEND_URL}/login?error=${encodeURIComponent('Invalid OAuth state. Possible CSRF attack.')}`
      );
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${ENV.FRONTEND_URL}/login?error=missing_code`);
    }

    try {
      res.clearCookie('oauth_state');
      const user = await AuthService.verifyGoogleCodeAndGetUser(code);
      const token = AuthService.createSessionToken(user);

      // Set session cookie
      res.cookie('reachinbox_session', token, {
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.redirect(`${ENV.FRONTEND_URL}/dashboard`);
    } catch (err: any) {
      console.error('[AuthController.googleCallback]', err.message);
      return res.redirect(
        `${ENV.FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`
      );
    }
  }

  /**
   * Returns current authenticated user
   * GET /api/auth/me
   */
  public static async getMe(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', user: null });
    }
    return res.json({ user: req.user });
  }

  /**
   * Logs out user by clearing session cookie
   * POST /api/auth/logout
   */
  public static async logout(req: Request, res: Response) {
    res.clearCookie('reachinbox_session', {
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return res.json({ success: true, message: 'Logged out successfully' });
  }
}
