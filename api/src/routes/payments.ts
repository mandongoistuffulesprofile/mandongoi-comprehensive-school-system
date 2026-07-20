import { Router } from 'express';
import { db } from '../db';
import { mpesaTransactions, receipts } from '../models/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { listAllPayments } from '../services/fees';

const router = Router();

router.get('/', authMiddleware, requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { type, matchStatus } = req.query;
    let data = await listAllPayments();

    if (type) data = data.filter((p) => p.type === type);
    if (matchStatus) data = data.filter((p) => p.matchStatus === matchStatus);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
