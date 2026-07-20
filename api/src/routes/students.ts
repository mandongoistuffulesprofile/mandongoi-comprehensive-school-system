import { Router } from 'express';
import { db } from '../db';
import { students } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole, requireOwnStudent } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { parsePagination, paginatedResult } from '../utils/pagination';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { notify } from '../services/notify';

const router = Router();

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  level: z.enum(['pre_primary', 'comprehensive']).optional(),
  grade: z.string().min(1),
  enrollmentDate: z.string().optional(),
  studentType: z.enum(['boarding', 'day']).optional(),
  boardingHouse: z.string().optional(),
  foodProgramType: z.enum(['bring_own', 'pay_fee', 'none']).optional(),
  status: z.enum(['active', 'transferred', 'graduated', 'withdrawn']).optional(),
  photoUrl: z.string().optional(),
});

const updateStudentSchema = createStudentSchema.partial();

router.get('/', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { grade, status, class: classFilter, search } = req.query as Record<string, string | undefined>;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);

    const conditions = [];
    if (grade) conditions.push(eq(students.grade, grade));
    if (classFilter) conditions.push(eq(students.class, classFilter));
    if (status) conditions.push(eq(students.status, status as any));
    if (search) {
      conditions.push(sql`(LOWER(${students.firstName}) LIKE LOWER(${'%' + search + '%'}) OR LOWER(${students.lastName}) LIKE LOWER(${'%' + search + '%'}))`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(students)
      .where(where);

    const data = await db
      .select()
      .from(students)
      .where(where)
      .orderBy(desc(students.enrollmentDate))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({ success: true, ...paginatedResult(data, Number(count), page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), validate(createStudentSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = { ...req.body };
    body.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth as string) : null;
    body.enrollmentDate = body.enrollmentDate ? new Date(body.enrollmentDate as string) : null;
    const [student] = await db.insert(students).values(body).returning();
    notify({
      title: 'New Student Enrolled',
      message: `${student.firstName} ${student.lastName} (${student.grade}) has been enrolled.`,
      type: 'info',
      link: `/students/${student.id}`,
    });
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireRole('schoolAdmin', 'teacher', 'accountant'), requireOwnStudent((r) => r.params.id), async (req: AuthRequest, res, next) => {
  try {
    const [student] = await db.select().from(students).where(eq(students.id, req.params.id)).limit(1);
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), validate(updateStudentSchema), async (req: AuthRequest, res, next) => {
  try {
    const body = { ...req.body };
    body.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth as string) : null;
    body.enrollmentDate = body.enrollmentDate ? new Date(body.enrollmentDate as string) : null;
    const [old] = await db.select({ status: students.status, firstName: students.firstName, lastName: students.lastName, grade: students.grade }).from(students).where(eq(students.id, req.params.id)).limit(1);
    const [student] = await db.update(students).set({ ...body, updatedAt: new Date() }).where(eq(students.id, req.params.id)).returning();
    if (old && body.status && body.status !== old.status) {
      const label = { transferred: 'Transferred', graduated: 'Graduated', withdrawn: 'Withdrawn' }[body.status] || body.status;
      notify({
        title: `Student ${label}`,
        message: `${student.firstName} ${student.lastName} (${student.grade}) status changed from ${old.status} to ${body.status}.`,
        type: 'info',
        link: `/students/${student.id}`,
      });
    }
    res.json({ success: true, data: student });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(students).where(eq(students.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
