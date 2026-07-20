import { Router } from 'express';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { parentStudentLinks, users, students } from '../models/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();


router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { userId, studentId } = req.query as Record<string, string | undefined>;
    const conditions = [];
    if (userId) conditions.push(eq(parentStudentLinks.userId, userId));
    if (studentId) conditions.push(eq(parentStudentLinks.studentId, studentId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const links = await db
      .select({
        id: parentStudentLinks.id,
        userId: parentStudentLinks.userId,
        studentId: parentStudentLinks.studentId,
        userEmail: users.email,
        userName: users.name,
        studentName: students.firstName,
        studentGrade: students.grade,
        createdAt: parentStudentLinks.createdAt,
      })
      .from(parentStudentLinks)
      .leftJoin(users, eq(parentStudentLinks.userId, users.id))
      .leftJoin(students, eq(parentStudentLinks.studentId, students.id))
      .where(where);
    res.json({ success: true, data: links });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { userId, studentId } = req.body;
    if (!userId || !studentId) {
      return res.status(400).json({ success: false, error: 'userId and studentId are required' });
    }
    const [existing] = await db
      .select()
      .from(parentStudentLinks)
      .where(and(eq(parentStudentLinks.userId, userId), eq(parentStudentLinks.studentId, studentId)))
      .limit(1);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Link already exists' });
    }
    const [link] = await db
      .insert(parentStudentLinks)
      .values({ userId, studentId })
      .returning();
    res.status(201).json({ success: true, data: link });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db
      .delete(parentStudentLinks)
      .where(eq(parentStudentLinks.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
