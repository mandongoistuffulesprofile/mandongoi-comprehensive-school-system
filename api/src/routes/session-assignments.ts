import { Router } from 'express';
import { db } from '../db';
import { sessionAssignments, staff, users } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { extraDutyPayments } from '../models/schema';
import { logger } from '../utils/logger';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, sessionType, dayOfWeek } = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (staffId) conditions.push(eq(sessionAssignments.staffId, staffId));
    if (sessionType) conditions.push(eq(sessionAssignments.sessionType, sessionType as any));
    if (dayOfWeek) conditions.push(eq(sessionAssignments.dayOfWeek, Number(dayOfWeek)));

    const data = await db
      .select({
        id: sessionAssignments.id,
        staffId: sessionAssignments.staffId,
        sessionType: sessionAssignments.sessionType,
        dayOfWeek: sessionAssignments.dayOfWeek,
        isActive: sessionAssignments.isActive,
        assignedAt: sessionAssignments.assignedAt,
        staffName: staff.name,
      })
      .from(sessionAssignments)
      .innerJoin(staff, eq(sessionAssignments.staffId, staff.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sessionAssignments.dayOfWeek, staff.name);

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { staffId, sessionType, dayOfWeek } = req.body;
    if (!staffId || !sessionType || dayOfWeek === undefined) {
      throw new AppError('staffId, sessionType, and dayOfWeek are required', 400);
    }
    if (![0, 1, 2, 3, 4, 5, 6].includes(dayOfWeek)) {
      throw new AppError('dayOfWeek must be 0-6 (Sunday-Saturday)', 400);
    }
    const [existing] = await db
      .select()
      .from(sessionAssignments)
      .where(and(eq(sessionAssignments.staffId, staffId), eq(sessionAssignments.dayOfWeek, dayOfWeek)))
      .limit(1);
    if (existing) {
      throw new AppError('This teacher already has a session assigned on this day', 409);
    }
    const [assignment] = await db
      .insert(sessionAssignments)
      .values({ staffId, sessionType, dayOfWeek, assignedBy: req.user!.id })
      .returning();
    res.status(201).json({ success: true, data: assignment });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(sessionAssignments).where(eq(sessionAssignments.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

router.post('/generate-payments', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) throw new AppError('month and year are required', 400);

    const assignments = await db
      .select({
        id: sessionAssignments.id,
        staffId: sessionAssignments.staffId,
        sessionType: sessionAssignments.sessionType,
        dayOfWeek: sessionAssignments.dayOfWeek,
        staffExtraRate: staff.extraSessionRate,
      })
      .from(sessionAssignments)
      .innerJoin(staff, eq(sessionAssignments.staffId, staff.id))
      .where(eq(sessionAssignments.isActive, true));

    const [settings] = await db
      .select({
        morningRate: sql`COALESCE(${sql.raw(`(SELECT morning_session_rate FROM school_settings LIMIT 1)`)}, 200)`,
        eveningRate: sql`COALESCE(${sql.raw(`(SELECT evening_session_rate FROM school_settings LIMIT 1)`)}, 300)`,
        weekendRate: sql`COALESCE(${sql.raw(`(SELECT weekend_session_rate FROM school_settings LIMIT 1)`)}, 500)`,
      })
      .from(sql`(SELECT 1) AS dummy`);

    const defaultRates: Record<string, number> = {
      morning: Number(settings?.morningRate || 200),
      evening: Number(settings?.eveningRate || 300),
      weekend: Number(settings?.weekendRate || 500),
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    let created = 0;
    let skipped = 0;

    for (const a of assignments) {
      const rate = Number(a.staffExtraRate) || defaultRates[a.sessionType] || 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() !== a.dayOfWeek) continue;

        const [existing] = await db
          .select()
          .from(extraDutyPayments)
          .where(and(
            eq(extraDutyPayments.staffId, a.staffId),
            eq(extraDutyPayments.date, date),
          ))
          .limit(1);
        if (existing) { skipped++; continue; }

        await db.insert(extraDutyPayments).values({
          staffId: a.staffId,
          sessionType: a.sessionType,
          date,
          rate: String(rate),
          amount: String(rate),
          notes: `Auto-generated from session assignment`,
        });
        created++;
      }
    }

    logger.info(`Generated ${created} extra duty payments for ${month}/${year} (${skipped} skipped)`);
    res.json({ success: true, data: { created, skipped } });
  } catch (err) { next(err); }
});

export default router;
