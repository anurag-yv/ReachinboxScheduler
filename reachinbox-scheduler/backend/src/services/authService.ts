import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { AuthUserPayload } from '../types';

export class AuthService {
  private static getGoogleClient(): OAuth2Client {
    return new OAuth2Client(
      ENV.GOOGLE_CLIENT_ID,
      ENV.GOOGLE_CLIENT_SECRET,
      ENV.GOOGLE_CALLBACK_URL
    );
  }

  /**
   * Generates Google OAuth consent screen URL with state parameter for CSRF mitigation
   */
  public static getGoogleAuthUrl(state: string): string {
    if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET) {
      throw new Error(
        'Google OAuth credentials are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env'
      );
    }

    const client = this.getGoogleClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'profile', 'email'],
      prompt: 'consent',
      state,
    });
  }

  /**
   * Exchanges authorization code with Google for tokens, verifies identity,
   * and persists or updates the user record in PostgreSQL.
   */
  public static async verifyGoogleCodeAndGetUser(code: string): Promise<AuthUserPayload> {
    const client = this.getGoogleClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (!tokens.id_token) {
      throw new Error('No id_token received from Google authentication');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: ENV.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid token payload received from Google');
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || undefined;

    // Upsert user in PostgreSQL
    const user = await prisma.user.upsert({
      where: { googleId },
      update: {
        name,
        email,
        avatarUrl,
      },
      create: {
        googleId,
        name,
        email,
        avatarUrl,
      },
    });

    // Check if user has at least one default sender record; create default if not
    const senderCount = await prisma.emailSender.count({
      where: { userId: user.id },
    });

    if (senderCount === 0) {
      await prisma.emailSender.create({
        data: {
          userId: user.id,
          name: `${name} (Ethereal)`,
          email: ENV.DEFAULT_SENDER_EMAIL,
          smtpHost: ENV.ETHEREAL_HOST,
          smtpPort: ENV.ETHEREAL_PORT,
          smtpUser: ENV.ETHEREAL_USER || 'ethereal_user',
          smtpPasswordEncrypted: '', // Empty or populated from default
        },
      });
    }

    return {
      userId: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl || undefined,
    };
  }

  /**
   * Creates a signed JWT session cookie
   */
  public static createSessionToken(payload: AuthUserPayload): string {
    return jwt.sign(payload, ENV.SESSION_SECRET, {
      expiresIn: '7d',
    });
  }

  /**
   * Verifies and decodes a session JWT token
   */
  public static verifySessionToken(token: string): AuthUserPayload | null {
    try {
      return jwt.verify(token, ENV.SESSION_SECRET) as AuthUserPayload;
    } catch {
      return null;
    }
  }
}
