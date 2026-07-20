import { Router } from 'express';
import { db } from '../db';
import { smsLogs, smsCampaigns } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { parsePagination, paginatedResult } from '../utils/pagination';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { campaignId, status } = req.query;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const conditions = [];
    if (campaignId) conditions.push(eq(smsLogs.campaignId, campaignId as string));
    if (status) conditions.push(eq(smsLogs.status, status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(smsLogs)
      .where(where);

    const data = await db.select().from(smsLogs)
      .where(where)
      .orderBy(desc(smsLogs.sentAt))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({ success: true, ...paginatedResult(data, Number(count), page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { campaignId, recipientId, recipientType, phoneNumber, message, templateId } = req.body;
    const [log] = await db.insert(smsLogs).values({
      campaignId: campaignId || null,
      recipientId: recipientId || null,
      recipientType,
      phoneNumber,
      message,
      templateId: templateId || null,
    }).returning();
    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

export default router;
