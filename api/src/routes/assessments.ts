import { Router } from 'express';
import { db } from '../db';
import { assessments } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole, requireOwnStudent } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const [assessment] = await db.insert(assessments).values({
      ...req.body,
      assessedBy: req.user!.id,
    }).returning();
    res.status(201).json({ success: true, data: assessment });
  } catch (err) {
    next(err);
  }
});

router.get('/student/:studentId', requireRole('schoolAdmin', 'teacher'), requireOwnStudent((r) => r.params.studentId), async (req: AuthRequest, res, next) => {
  try {
    const { term, academicYear } = req.query;
    const conditions = [eq(assessments.studentId, req.params.studentId)];
    if (term) conditions.push(eq(assessments.term, Number(term)));
    if (academicYear) conditions.push(eq(assessments.academicYear, Number(academicYear)));

    const data = await db.select().from(assessments)
      .where(and(...conditions))
      .orderBy(desc(assessments.assessedAt));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/by-class', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { grade, learningAreaId, term, academicYear } = req.query;
    if (!grade || !learningAreaId || !term || !academicYear) {
      throw new AppError('grade, learningAreaId, term, and academicYear are required', 400);
    }
    const data = await db
      .select()
      .from(assessments)
      .where(and(
        eq(assessments.learningAreaId, learningAreaId as string),
        eq(assessments.term, Number(term)),
        eq(assessments.academicYear, Number(academicYear)),
      ));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { assessments: items, term, academicYear } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Assessments array is required', 400);
    }

    const validTypes = ['formative', 'summative'];
    const values = items.map((item: any) => {
      if (!item.studentId || !item.learningAreaId) {
        throw new AppError('Each assessment requires studentId and learningAreaId', 400);
      }
      return {
        studentId: item.studentId,
        learningAreaId: item.learningAreaId,
        strandId: item.strandId || null,
        term: term ?? item.term ?? 1,
        academicYear: academicYear ?? item.academicYear ?? new Date().getFullYear(),
        type: validTypes.includes(item.type) ? item.type : 'summative',
        score: item.score != null ? String(item.score) : null,
        performanceLevel: item.performanceLevel || null,
        remarks: item.remarks || null,
        assessedBy: req.user!.id,
      };
    });

    const created = await db.insert(assessments).values(values)
      .onConflictDoUpdate({
        target: [assessments.studentId, assessments.learningAreaId, assessments.term, assessments.academicYear, assessments.type],
        set: {
          score: sql`EXCLUDED.score`,
          performanceLevel: sql`EXCLUDED.performance_level`,
          remarks: sql`EXCLUDED.remarks`,
          assessedBy: sql`EXCLUDED.assessed_by`,
        },
      })
      .returning();

    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    next(err);
  }
});

export default router;
