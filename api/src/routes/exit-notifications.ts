import { Router } from 'express';
import { db } from '../db';
import { exitNotifications, staff } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { status } = req.query;
    const conditions = [];
    if (status) conditions.push(eq(exitNotifications.status, status as any));
    const data = await db.select({
      id: exitNotifications.id,
      staffId: exitNotifications.staffId,
      exitDate: exitNotifications.exitDate,
      status: exitNotifications.status,
      detectedAt: exitNotifications.detectedAt,
      actionedAt: exitNotifications.actionedAt,
      actionType: exitNotifications.actionType,
      staffName: staff.name,
      staffRole: staff.role,
    }).from(exitNotifications)
      .innerJoin(staff, eq(exitNotifications.staffId, staff.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(exitNotifications.detectedAt));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/detect', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const expiringStaff = await db.select().from(staff).where(
      and(eq(staff.isActive, true), sql`${staff.contractEndDate} IS NOT NULL`, sql`${staff.contractEndDate} <= CURRENT_DATE + INTERVAL '14 days'`),
    );
    const created = [];
    for (const s of expiringStaff) {
      const [existing] = await db.select().from(exitNotifications).where(
        and(eq(exitNotifications.staffId, s.id), eq(exitNotifications.status, 'pending')),
      ).limit(1);
      if (!existing) {
        const [n] = await db.insert(exitNotifications).values({
          staffId: s.id, exitDate: s.contractEndDate!,
        }).returning();
        created.push(n);
      }
    }
    res.json({ success: true, data: { detected: created.length, total: expiringStaff.length } });
  } catch (err) { next(err); }
});

router.post('/:id/action', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { actionType } = req.body;
    if (!['reassign', 'shuffle', 'dismiss'].includes(actionType)) {
      return res.status(400).json({ success: false, error: 'actionType must be reassign, shuffle, or dismiss' });
    }
    const [n] = await db.update(exitNotifications).set({
      status: 'actioned', actionType, actionedAt: new Date(), actionedBy: req.user!.id,
    }).where(eq(exitNotifications.id, req.params.id)).returning();
    if (!n) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: n });
  } catch (err) { next(err); }
});

router.post('/:id/dismiss', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [n] = await db.update(exitNotifications).set({
      status: 'dismissed', actionType: 'dismiss', actionedAt: new Date(), actionedBy: req.user!.id,
    }).where(eq(exitNotifications.id, req.params.id)).returning();
    if (!n) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: n });
  } catch (err) { next(err); }
});

router.get('/qualified/:learningAreaId', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const allTeachers = await db.select().from(staff).where(
      and(eq(staff.isActive, true), eq(staff.role, 'teacher'),
        sql`(${staff.contractEndDate} IS NULL OR ${staff.contractEndDate} >= CURRENT_DATE)`),
    );
    res.json({ success: true, data: allTeachers });
  } catch (err) { next(err); }
});

export default router;
