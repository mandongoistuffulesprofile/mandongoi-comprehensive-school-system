import { Router } from 'express';
import { db } from '../db';
import { auditLogs } from '../models/schema';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { parsePagination, paginatedResult } from '../utils/pagination';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { category, action, startDate, endDate, search } = req.query;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const conditions = [];

    if (category) conditions.push(eq(auditLogs.category, category as any));
    if (action) conditions.push(eq(auditLogs.action, action as string));
    if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));
    if (search) {
      const q = `%${search}%`;
      conditions.push(sql`(${auditLogs.description} ILIKE ${q} OR ${auditLogs.performedByName} ILIKE ${q})`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(where);

    const data = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const summary = await db
      .select({
        category: auditLogs.category,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(auditLogs)
      .groupBy(auditLogs.category)
      .orderBy(desc(sql`COUNT(*)`));

    res.json({
      success: true,
      ...paginatedResult(data, Number(count), page, limit),
      summary,
    });
  } catch (err) { next(err); }
});

export default router;
