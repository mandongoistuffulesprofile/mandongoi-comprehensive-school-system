import { Router } from 'express';
import { db } from '../db';
import { schoolSettings } from '../models/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    let [settings] = await db.select().from(schoolSettings).limit(1);
    if (!settings) {
      [settings] = await db.insert(schoolSettings).values({}).returning();
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.put('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = {
      schoolName: req.body.schoolName,
      schoolMotto: req.body.schoolMotto,
      schoolAddress: req.body.schoolAddress,
      schoolPhone: req.body.schoolPhone,
      schoolEmail: req.body.schoolEmail,
      logoUrl: req.body.logoUrl,
      currentTerm: req.body.currentTerm,
      currentAcademicYear: req.body.currentAcademicYear,
      termStartDate: req.body.termStartDate,
      termEndDate: req.body.termEndDate,
      nextTermStartDate: req.body.nextTermStartDate,
      gradingSystem: req.body.gradingSystem,
      currency: req.body.currency,
      timezone: req.body.timezone,
      smsSenderId: req.body.smsSenderId,
      morningSessionRate: req.body.morningSessionRate,
      eveningSessionRate: req.body.eveningSessionRate,
      weekendSessionRate: req.body.weekendSessionRate,
      classTeacherSignature: req.body.classTeacherSignature,
      headTeacherSignature: req.body.headTeacherSignature,
      payDay: req.body.payDay,
    };
    let [existing] = await db.select().from(schoolSettings).limit(1);
    if (existing) {
      [existing] = await db.update(schoolSettings).set({ ...data, updatedAt: new Date() }).where(eq(schoolSettings.id, existing.id)).returning();
    } else {
      [existing] = await db.insert(schoolSettings).values(data).returning();
    }
    res.json({ success: true, data: existing });
  } catch (err) {
    next(err);
  }
});

export default router;
