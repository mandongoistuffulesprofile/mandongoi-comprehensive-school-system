import { AuthRequest, authMiddleware } from './auth';
import { Response, NextFunction } from 'express';
import { db } from '../db';
import { parentStudentLinks, feeInvoices } from '../models/schema';
import { eq, and } from 'drizzle-orm';

type Role = 'schoolAdmin' | 'teacher' | 'accountant' | 'parent';

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireOwnStudent(getStudentId: (req: AuthRequest) => string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'parent') return next();
      const studentId = getStudentId(req);
      const [link] = await db
        .select()
        .from(parentStudentLinks)
        .where(and(
          eq(parentStudentLinks.userId, req.user!.id),
          eq(parentStudentLinks.studentId, studentId),
        ))
        .limit(1);
      if (!link) {
        return res.status(403).json({ success: false, error: 'Not authorized for this student' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireOwnInvoice(getInvoiceId: (req: AuthRequest) => string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'parent') return next();
      const [invoice] = await db
        .select()
        .from(feeInvoices)
        .where(eq(feeInvoices.id, getInvoiceId(req)))
        .limit(1);
      if (!invoice) {
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      const [link] = await db
        .select()
        .from(parentStudentLinks)
        .where(and(
          eq(parentStudentLinks.userId, req.user!.id),
          eq(parentStudentLinks.studentId, invoice.studentId),
        ))
        .limit(1);
      if (!link) {
        return res.status(403).json({ success: false, error: 'Not authorized for this invoice' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

export { authMiddleware };
