import { Router } from 'express';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { attendanceStudent } from '../models/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();


router.get(
  '/summary/:studentId',
  requireRole('schoolAdmin', 'teacher', 'parent'),
  async (req: AuthRequest, res, next) => {
    try {
      const { studentId } = req.params;
      const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

      const [result] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          present: sql<number>`COUNT(*) FILTER (WHERE ${attendanceStudent.status} = 'present')`,
          absent: sql<number>`COUNT(*) FILTER (WHERE ${attendanceStudent.status} = 'absent')`,
          late: sql<number>`COUNT(*) FILTER (WHERE ${attendanceStudent.status} = 'late')`,
          excused: sql<number>`COUNT(*) FILTER (WHERE ${attendanceStudent.status} = 'excused')`,
        })
        .from(attendanceStudent)
        .where(
          sql`${attendanceStudent.studentId} = ${studentId}::uuid AND EXTRACT(YEAR FROM ${attendanceStudent.date}) = ${year}`,
        );

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
