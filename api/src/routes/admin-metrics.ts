import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60_000;

async function queryRow(sqlQuery: any): Promise<any> {
  const result = await db.execute(sqlQuery);
  return (result as any).rows?.[0] || {};
}

router.get('/metrics', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return res.json({ success: true, data: cache.data, cached: true });
    }

    const [payRow, invRow, stuRow, unmRow, sizeRow] = await Promise.all([
      queryRow(sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(CAST(amount AS numeric)), 0)::text AS total FROM receipts WHERE issued_at >= CURRENT_DATE`),
      queryRow(sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CAST(amount_paid AS numeric)), 0)::text AS collected FROM fee_invoices`),
      queryRow(sql`SELECT COUNT(*)::int AS count FROM students WHERE status = 'active'`),
      queryRow(sql`SELECT COUNT(*)::int AS count FROM mpesa_transactions WHERE match_status = 'unmatched'`),
      queryRow(sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`),
    ]);

    const data = {
      paymentsToday: Number(payRow.count || 0),
      revenueToday: payRow.total || '0',
      totalInvoices: Number(invRow.total || 0),
      totalCollected: invRow.collected || '0',
      activeStudents: Number(stuRow.count || 0),
      unmatchedPayments: Number(unmRow.count || 0),
      dbSize: sizeRow.size || 'unknown',
      timestamp: new Date().toISOString(),
    };

    cache = { data, timestamp: Date.now() };
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;
