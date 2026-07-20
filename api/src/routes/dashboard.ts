import { Router } from 'express';
import { db } from '../db';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/kpis', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
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
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
