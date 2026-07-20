import { db } from '../db';
import { auditLogs } from '../models/schema';
import type { AuthRequest } from '../middleware/auth';

type Category = 'leave_note' | 'invoice' | 'payment' | 'student' | 'user' | 'setting' | 'attendance' | 'report_card' | 'fee_structure' | 'other';

export async function logAudit(params: {
  action: string;
  category: Category;
  entityType?: string;
  entityId?: string;
  description: string;
  req?: AuthRequest;
  performedByName?: string;
  metadata?: Record<string, unknown>;
}) {
  const { action, category, entityType, entityId, description, req, performedByName, metadata } = params;
  try {
    await db.insert(auditLogs).values({
      action,
      category,
      entityType,
      entityId,
      description,
      performedBy: req?.user?.id ?? null,
      performedByName: performedByName ?? req?.user?.name ?? null,
      metadata: metadata as any ?? null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
