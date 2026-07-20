import { Router } from 'express';
import { db } from '../db';
import { notifications } from '../models/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { unreadOnly } = req.query;
    const conditions = [eq(notifications.role, req.user!.role)];
    if (unreadOnly === 'true') conditions.push(eq(notifications.isRead, false));

    const data = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.role, req.user!.role), eq(notifications.isRead, false)));

    res.json({ success: true, data, unreadCount: Number(countResult.count) });
  } catch (err) { next(err); }
});

router.patch('/:id/read', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const [note] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, req.params.id))
      .returning();
    if (!note) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: note });
  } catch (err) { next(err); }
});

router.patch('/read-all', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.role, req.user!.role));
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
