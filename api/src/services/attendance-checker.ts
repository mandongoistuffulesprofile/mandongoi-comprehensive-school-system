import { db } from '../db';
import { attendanceStudent, students, notifications } from '../models/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { notify } from './notify';

export async function evaluateLowAttendance() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const threshold = 5;

    const absences = await db
      .select({
        studentId: attendanceStudent.studentId,
        count: sql<number>`COUNT(*)`,
        firstName: students.firstName,
        lastName: students.lastName,
        grade: students.grade,
      })
      .from(attendanceStudent)
      .innerJoin(students, eq(attendanceStudent.studentId, students.id))
      .where(and(
        sql`${attendanceStudent.status} IN ('absent', 'late')`,
        gte(attendanceStudent.date, thirtyDaysAgo),
      ))
      .groupBy(attendanceStudent.studentId, students.firstName, students.lastName, students.grade)
      .having(sql`COUNT(*) >= ${threshold}`);

    if (absences.length === 0) return;

    let notified = 0;
    for (const a of absences) {
      const [existing] = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(
          eq(notifications.type, 'warning'),
          gte(notifications.createdAt, todayStart),
          eq(notifications.link, `/students/${a.studentId}`),
        ))
        .limit(1);

      if (existing) continue;

      await notify({
        title: `Low Attendance Alert — ${a.firstName} ${a.lastName}`,
        message: `${a.firstName} ${a.lastName} (${a.grade}) has ${a.count} absence(s)/late(s) in the last 30 days.`,
        type: 'warning',
        link: `/students/${a.studentId}`,
        roles: ['schoolAdmin', 'teacher'],
      });
      notified++;
    }

    if (notified > 0) {
      logger.info(`Attendance checker: ${notified} notification(s) for ${absences.length} student(s) with low attendance`);
    }
  } catch (err) {
    logger.error('Low attendance evaluation error', { error: err });
  }
}
