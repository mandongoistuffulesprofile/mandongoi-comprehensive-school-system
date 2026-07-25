import { Router } from 'express';
import { db } from '../db';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { sql } from 'drizzle-orm';

const router = Router();

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 60_000;

function getCached(key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown): void {
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

router.get('/kpis', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const cacheKey = 'dashboard:kpis';
    const cached = getCached(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    const result = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM students WHERE status = 'active')::int AS active_students,
        (SELECT COUNT(*) FROM staff WHERE is_active = true)::int AS active_staff,
        (SELECT COUNT(*) FROM fee_invoices WHERE status IN ('unpaid', 'partial') OR status = 'overdue')::int AS pending_invoices,
        (SELECT COALESCE(SUM(balance::numeric), 0) FROM fee_invoices) AS total_balance,
        (SELECT COALESCE(SUM(amount::numeric), 0) FROM receipts) AS total_collected,
        (SELECT COALESCE(SUM(total_amount::numeric), 0) FROM fee_invoices) AS total_expected,
        (SELECT COUNT(*) FROM sms_campaigns WHERE status = 'sent')::int AS sent_campaigns
    `);
    const data = result.rows[0];
    setCache(cacheKey, data);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
