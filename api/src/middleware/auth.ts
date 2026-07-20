import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: typeof users.$inferSelect;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as { userId: string };
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
