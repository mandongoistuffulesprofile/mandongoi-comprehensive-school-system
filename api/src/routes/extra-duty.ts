import { Router } from 'express';
import { db } from '../db';
import { extraDutyPayments, staff, schoolSettings } from '../models/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { calculateExtraDutyPayments } from '../services/payroll';

const router = Router();

router.get('/calculate', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();
    const results = await calculateExtraDutyPayments(m, y);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, status } = req.query;
    const conditions = [];
    if (staffId) conditions.push(eq(extraDutyPayments.staffId, staffId as string));
    if (status) conditions.push(eq(extraDutyPayments.status, status as 'paid' | 'approved' | 'pending'));
    const data = await db
      .select({
        id: extraDutyPayments.id,
        staffId: extraDutyPayments.staffId,
        staffName: staff.name,
        sessionType: extraDutyPayments.sessionType,
        date: extraDutyPayments.date,
        rate: extraDutyPayments.rate,
        amount: extraDutyPayments.amount,
        status: extraDutyPayments.status,
        notes: extraDutyPayments.notes,
        createdAt: extraDutyPayments.createdAt,
      })
      .from(extraDutyPayments)
      .innerJoin(staff, eq(extraDutyPayments.staffId, staff.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${extraDutyPayments.createdAt} DESC`);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, sessionType, date, rate, amount, notes } = req.body;
    const [payment] = await db.insert(extraDutyPayments).values({
      staffId, sessionType, date, rate, amount, notes,
    }).returning();
    res.status(201).json({ success: true, data: payment });
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { status: req.body.status, notes: req.body.notes, payrollRunId: req.body.payrollRunId, timetableSlotId: req.body.timetableSlotId };
    const [payment] = await db.update(extraDutyPayments).set(data).where(eq(extraDutyPayments.id, req.params.id)).returning();
    if (!payment) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: payment });
  } catch (err) { next(err); }
});

router.get('/rates', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const [settings] = await db.select().from(schoolSettings).limit(1);
    const allStaff = await db.select({ id: staff.id, name: staff.name, extraSessionRate: staff.extraSessionRate, teacherType: staff.teacherType }).from(staff).where(eq(staff.isActive, true));
    res.json({
      success: true,
      data: {
        defaults: {
          morning: settings?.morningSessionRate || '200',
          evening: settings?.eveningSessionRate || '300',
          weekend: settings?.weekendSessionRate || '500',
        },
        staff: allStaff,
      },
    });
  } catch (err) { next(err); }
});

export default router;
