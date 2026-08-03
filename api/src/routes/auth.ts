import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { validateLogin, validateRegister } from '../middleware/validation';
import { requireRole } from '../middleware/rbac';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { db } from '../db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.post('/login', validateLogin, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const [user] = await db.select().from(users).where(eq(users.email, username)).limit(1);

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', validateRegister, requireRole('schoolAdmin'), async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const userEmail = email || (phone ? `${phone.replace(/[^0-9]/g, '').slice(-9)}@school.edu` : undefined);
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'Email or phone is required' });
    }

    const existing = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db.insert(users).values({
      name,
      email: userEmail,
      phone,
      passwordHash,
      role: role || 'teacher',
      mustResetPassword: true,
    }).returning();

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    // Always return same message to prevent email enumeration
    res.json({ success: true, data: { message: 'If the email exists, a reset link has been sent.' } });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    let payload: { userId: string };
    try {
      payload = jwt.verify(token, config.jwt.secret) as { userId: string };
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }
    const passwordHash = await hashPassword(password);
    await db.update(users).set({ passwordHash, mustResetPassword: false }).where(eq(users.id, payload.userId));
    res.json({ success: true, data: { message: 'Password reset successful' } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authMiddleware, requireRole('schoolAdmin', 'teacher', 'accountant', 'parent'), async (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
    },
  });
});

export default router;
