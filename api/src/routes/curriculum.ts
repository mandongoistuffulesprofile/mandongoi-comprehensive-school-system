import { Router } from 'express';
import { db } from '../db';
import { curriculumConfigs, curriculumSubjects, choiceGroupOptions, learningAreas } from '../models/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const configs = await db
      .select()
      .from(curriculumConfigs)
      .orderBy(desc(curriculumConfigs.effectiveFrom));
    res.json({ success: true, data: configs });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const [config] = await db
      .select()
      .from(curriculumConfigs)
      .where(eq(curriculumConfigs.id, req.params.id))
      .limit(1);
    if (!config) return res.status(404).json({ success: false, error: 'Config not found' });

    const subjects = await db
      .select()
      .from(curriculumSubjects)
      .where(eq(curriculumSubjects.curriculumConfigId, config.id))
      .orderBy(curriculumSubjects.sortOrder);

    const subjectIds = subjects.map(s => s.id);
    const options = subjectIds.length > 0
      ? await db.select().from(choiceGroupOptions).where(sql`${choiceGroupOptions.curriculumSubjectId} = ANY(${subjectIds}::uuid[])`)
      : [];

    res.json({
      success: true,
      data: {
        ...config,
        subjects: subjects.map(s => ({
          ...s,
          options: options.filter(o => o.curriculumSubjectId === s.id),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { gradeBand, effectiveFrom, lessonDurationMinutes, breakSchedule, subjects } = req.body;
    const [config] = await db.insert(curriculumConfigs).values({
      gradeBand,
      effectiveFrom: new Date(effectiveFrom),
      lessonDurationMinutes,
      breakSchedule: breakSchedule || [],
    }).returning();

    if (subjects && subjects.length > 0) {
      await db.insert(curriculumSubjects).values(
        subjects.map((s: any, i: number) => ({
          curriculumConfigId: config.id,
          name: s.name,
          learningAreaId: s.learningAreaId || null,
          weeklyLessons: s.weeklyLessons,
          allowsDoubleLesson: s.allowsDoubleLesson || false,
          isChoiceGroup: s.isChoiceGroup || false,
          requiresRoomType: s.requiresRoomType || null,
          sortOrder: i,
        }))
      );
    }

    res.status(201).json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { gradeBand, effectiveFrom, lessonDurationMinutes, breakSchedule } = req.body;
    const [config] = await db.update(curriculumConfigs).set({
      ...(gradeBand && { gradeBand }),
      ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
      ...(lessonDurationMinutes && { lessonDurationMinutes }),
      ...(breakSchedule && { breakSchedule }),
    }).where(eq(curriculumConfigs.id, req.params.id)).returning();
    if (!config) return res.status(404).json({ success: false, error: 'Config not found' });
    res.json({ success: true, data: config });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [deleted] = await db.delete(curriculumConfigs).where(eq(curriculumConfigs.id, req.params.id)).returning();
    if (!deleted) return res.status(404).json({ success: false, error: 'Config not found' });
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.post('/seed/default', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const kicd2024 = [
      { gradeBand: 'PP', lessonDurationMinutes: 30, subjects: [
        { name: 'Language Activities', weeklyLessons: 5 },
        { name: 'Mathematical Activities', weeklyLessons: 5 },
        { name: 'Environmental Activities', weeklyLessons: 5 },
        { name: 'Psychomotor and Creative Activities', weeklyLessons: 5 },
        { name: 'Religious Education Activities', weeklyLessons: 5 },
      ]},
      { gradeBand: 'LOWER_PRIMARY', lessonDurationMinutes: 35, subjects: [
        { name: 'Mathematics', weeklyLessons: 5 },
        { name: 'English', weeklyLessons: 5 },
        { name: 'Kiswahili', weeklyLessons: 4 },
        { name: 'Religious Education', weeklyLessons: 3, isChoiceGroup: true },
        { name: 'Social Studies', weeklyLessons: 4 },
        { name: 'Integrated Science', weeklyLessons: 5, allowsDoubleLesson: true },
        { name: 'Agriculture and Nutrition', weeklyLessons: 5, allowsDoubleLesson: true },
      ]},
      { gradeBand: 'UPPER_PRIMARY', lessonDurationMinutes: 40, subjects: [
        { name: 'Mathematics', weeklyLessons: 5 },
        { name: 'English', weeklyLessons: 5 },
        { name: 'Kiswahili', weeklyLessons: 4 },
        { name: 'Religious Education', weeklyLessons: 3, isChoiceGroup: true },
        { name: 'Social Studies', weeklyLessons: 4 },
        { name: 'Integrated Science', weeklyLessons: 5, allowsDoubleLesson: true },
        { name: 'Agriculture and Nutrition', weeklyLessons: 4, allowsDoubleLesson: true },
        { name: 'Creative Arts and Sports', weeklyLessons: 5, allowsDoubleLesson: true },
      ]},
      { gradeBand: 'JSS', lessonDurationMinutes: 45, subjects: [
        { name: 'Mathematics', weeklyLessons: 5 },
        { name: 'English', weeklyLessons: 5 },
        { name: 'Kiswahili', weeklyLessons: 4 },
        { name: 'Religious Education', weeklyLessons: 3, isChoiceGroup: true },
        { name: 'Social Studies', weeklyLessons: 4 },
        { name: 'Integrated Science', weeklyLessons: 4, allowsDoubleLesson: true },
        { name: 'Agriculture and Nutrition', weeklyLessons: 4, allowsDoubleLesson: true },
        { name: 'Pre-Technical Studies', weeklyLessons: 3, allowsDoubleLesson: true },
        { name: 'Creative Arts and Sports', weeklyLessons: 3, allowsDoubleLesson: true },
      ]},
    ];

    const created = [];
    for (const band of kicd2024) {
      const [existing] = await db
        .select()
        .from(curriculumConfigs)
        .where(eq(curriculumConfigs.gradeBand, band.gradeBand as any))
        .orderBy(desc(curriculumConfigs.effectiveFrom))
        .limit(1);
      if (existing) {
        created.push({ gradeBand: band.gradeBand, status: 'skipped (already exists)' });
        continue;
      }
      const [config] = await db.insert(curriculumConfigs).values({
        gradeBand: band.gradeBand as any,
        effectiveFrom: new Date('2024-01-01'),
        lessonDurationMinutes: band.lessonDurationMinutes,
        breakSchedule: [],
      }).returning();

      await db.insert(curriculumSubjects).values(
        band.subjects.map((s, i) => ({
          curriculumConfigId: config.id,
          name: s.name,
          weeklyLessons: s.weeklyLessons,
          allowsDoubleLesson: s.allowsDoubleLesson || false,
          isChoiceGroup: s.isChoiceGroup || false,
          sortOrder: i,
        }))
      );
      created.push({ gradeBand: band.gradeBand, status: 'seeded' });
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
