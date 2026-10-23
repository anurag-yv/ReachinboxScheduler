import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthUserPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies?.reachinbox_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    if (req.accepts('html') && !req.originalUrl.startsWith('/api/')) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=Please+sign+in+first+to+access+this+page`);
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication session required. Please sign in via Google.',
    });
  }

  const user = AuthService.verifySessionToken(token);
  if (!user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Session has expired or is invalid. Please sign in again.',
    });
  }

  req.user = user;
  next();
};
