import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['schoolAdmin', 'teacher', 'accountant', 'parent']).optional(),
});

export function validateLogin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  next();
}

export function validateRegister(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  next();
}
