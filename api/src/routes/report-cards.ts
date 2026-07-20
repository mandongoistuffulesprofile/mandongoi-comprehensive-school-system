import { Router } from 'express';
import { db } from '../db';
import { reportCards, students } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole, requireOwnStudent } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { notify } from '../services/notify';

const router = Router();

router.post('/generate', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, term, academicYear, compiledResults, teacherComments, headTeacherComments } = req.body;
    const [card] = await db.insert(reportCards).values({
      studentId,
      term,
      academicYear,
      compiledResults,
      teacherComments,
      headTeacherComments,
      generatedBy: req.user!.id,
    }).returning();
    res.status(201).json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/publish', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [card] = await db.update(reportCards).set({ publishedAt: new Date() }).where(eq(reportCards.id, req.params.id)).returning();
    if (card) {
      const [student] = await db.select({ firstName: students.firstName, lastName: students.lastName, grade: students.grade }).from(students).where(eq(students.id, card.studentId)).limit(1);
      if (student) {
        notify({
          title: 'Report Card Published',
          message: `Report card for ${student.firstName} ${student.lastName} (${student.grade}) — Term ${card.term} ${card.academicYear} has been published.`,
          type: 'success',
          link: `/students/${card.studentId}`,
        });
      }
    }
    res.json({ success: true, data: card });
  } catch (err) {
    next(err);
  }
});

router.get('/student/:studentId', requireRole('schoolAdmin', 'teacher', 'parent'), requireOwnStudent((r) => r.params.studentId), async (req: AuthRequest, res, next) => {
  try {
    const { term, academicYear } = req.query;
    const conditions = [eq(reportCards.studentId, req.params.studentId)];
    if (term) conditions.push(eq(reportCards.term, Number(term)));
    if (academicYear) conditions.push(eq(reportCards.academicYear, Number(academicYear)));

    const data = await db.select().from(reportCards)
      .where(and(...conditions))
      .orderBy(desc(reportCards.academicYear), desc(reportCards.term));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
