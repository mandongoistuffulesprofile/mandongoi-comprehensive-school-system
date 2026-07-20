import { Router } from 'express';
import { db } from '../db';
import { leaveNotes, students, users, attendanceStudent } from '../models/schema';
import { eq, desc, and, sql, gte, lte } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logAudit } from '../services/audit';
import { notify } from '../services/notify';

const router = Router();

const NOTE_SELECT = {
  id: leaveNotes.id,
  studentId: leaveNotes.studentId,
  studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
  grade: students.grade,
  reason: leaveNotes.reason,
  leaveDate: leaveNotes.leaveDate,
  expectedReturnDate: leaveNotes.expectedReturnDate,
  actualReturnDate: leaveNotes.actualReturnDate,
  status: leaveNotes.status,
  notedByName: users.name,
  approvedAt: leaveNotes.approvedAt,
  printedAt: leaveNotes.printedAt,
  createdAt: leaveNotes.createdAt,
};

router.get('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { status, studentId } = req.query;
    const conditions = [];
    if (status) conditions.push(eq(leaveNotes.status, status as 'approved' | 'pending' | 'rejected'));
    if (studentId) conditions.push(eq(leaveNotes.studentId, studentId as string));

    const data = await db
      .select(NOTE_SELECT)
      .from(leaveNotes)
      .innerJoin(students, eq(leaveNotes.studentId, students.id))
      .leftJoin(users, eq(leaveNotes.notedBy, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leaveNotes.createdAt));

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, reason, leaveDate, expectedReturnDate } = req.body;
    const leave = new Date(leaveDate as string);
    const [note] = await db.insert(leaveNotes).values({
      studentId,
      reason,
      leaveDate: leave,
      expectedReturnDate: new Date(expectedReturnDate as string),
      notedBy: req.user!.id,
    }).returning();

    const [existing] = await db
      .select({ id: attendanceStudent.id })
      .from(attendanceStudent)
      .where(and(eq(attendanceStudent.studentId, studentId), eq(attendanceStudent.date, leave)))
      .limit(1);
    if (!existing) {
      await db.insert(attendanceStudent)
        .values({ studentId, date: leave, status: 'absent', markedBy: req.user!.id });
    }

    const [studentName] = await db
      .select({ fullName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})` })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    await notify({
      title: 'Student Leave',
      message: `${studentName?.fullName || 'A student'} has been sent on leave from ${leave.toISOString().slice(0, 10)} — ${reason}`,
      type: 'info',
      roles: ['schoolAdmin', 'teacher'],
    });

    await logAudit({
      action: 'create',
      category: 'leave_note',
      entityType: 'leave_note',
      entityId: note.id,
      description: `Leave note created for student — marked absent on ${leave.toISOString().slice(0, 10)}`,
      req,
    });

    res.status(201).json({ success: true, data: note });
  } catch (err) { next(err); }
});

router.patch('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data: Record<string, any> = {
      status: req.body.status,
      reason: req.body.reason,
      leaveDate: req.body.leaveDate ? new Date(req.body.leaveDate as string) : undefined,
      expectedReturnDate: req.body.expectedReturnDate ? new Date(req.body.expectedReturnDate as string) : undefined,
      actualReturnDate: req.body.actualReturnDate ? new Date(req.body.actualReturnDate as string) : undefined,
      printedAt: req.body.printedAt ? new Date() : undefined,
    };

    if (data.status === 'approved') {
      data.notedBy = req.user!.id;
      data.approvedAt = new Date();
    }

    const [note] = await db.update(leaveNotes)
      .set(data)
      .where(eq(leaveNotes.id, req.params.id))
      .returning();
    if (!note) return res.status(404).json({ success: false, error: 'Not found' });

    if (data.status === 'approved') {
      const leaveStart = new Date(note.leaveDate);
      const leaveEnd = new Date(note.expectedReturnDate);
      const dates: Date[] = [];
      const current = new Date(leaveStart);
      while (current <= leaveEnd) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      for (const d of dates) {
        const [existing] = await db
          .select({ id: attendanceStudent.id })
          .from(attendanceStudent)
          .where(and(eq(attendanceStudent.studentId, note.studentId), eq(attendanceStudent.date, d)))
          .limit(1);
        if (!existing) {
          await db.insert(attendanceStudent)
            .values({ studentId: note.studentId, date: d, status: 'excused', markedBy: req.user!.id });
        }
      }

      const [studentName] = await db
        .select({ fullName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})` })
        .from(students)
        .where(eq(students.id, note.studentId))
        .limit(1);

      await notify({
        title: 'Leave Approved',
        message: `${studentName?.fullName || 'A student'}'s leave (${note.reason}) has been approved — marked excused until ${leaveEnd.toISOString().slice(0, 10)}`,
        type: 'info',
        roles: ['schoolAdmin', 'teacher'],
      });
    }

    await logAudit({
      action: data.status === 'approved' ? 'approve' : 'update',
      category: 'leave_note',
      entityType: 'leave_note',
      entityId: note.id,
      description: `Leave note ${data.status === 'approved' ? 'approved' : 'updated'} for student`,
      req,
    });

    res.json({ success: true, data: note });
  } catch (err) { next(err); }
});

router.patch('/:id/print', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const [note] = await db.update(leaveNotes)
      .set({ printedAt: new Date() })
      .where(eq(leaveNotes.id, req.params.id))
      .returning();
    if (!note) return res.status(404).json({ success: false, error: 'Not found' });

    await logAudit({
      action: 'print',
      category: 'leave_note',
      entityType: 'leave_note',
      entityId: note.id,
      description: `Leave note printed`,
      req,
    });

    const full = await db
      .select(NOTE_SELECT)
      .from(leaveNotes)
      .innerJoin(students, eq(leaveNotes.studentId, students.id))
      .leftJoin(users, eq(leaveNotes.notedBy, users.id))
      .where(eq(leaveNotes.id, req.params.id))
      .limit(1);
    res.json({ success: true, data: full[0] });
  } catch (err) { next(err); }
});

router.patch('/:id/return', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const [note] = await db
      .select()
      .from(leaveNotes)
      .where(eq(leaveNotes.id, req.params.id))
      .limit(1);
    if (!note) return res.status(404).json({ success: false, error: 'Not found' });
    if (note.status !== 'approved') throw new AppError('Can only return an approved leave', 400);
    if (note.actualReturnDate) throw new AppError('Student already returned', 400);

    const returnDate = new Date();
    const [updated] = await db.update(leaveNotes)
      .set({ actualReturnDate: returnDate })
      .where(eq(leaveNotes.id, req.params.id))
      .returning();

    await db.delete(attendanceStudent)
      .where(and(
        eq(attendanceStudent.studentId, note.studentId),
        sql`${attendanceStudent.date} > ${returnDate}`,
        sql`${attendanceStudent.status} IN ('absent', 'excused')`,
      ));

    const [existing] = await db
      .select({ id: attendanceStudent.id })
      .from(attendanceStudent)
      .where(and(eq(attendanceStudent.studentId, note.studentId), eq(attendanceStudent.date, returnDate)))
      .limit(1);
    if (!existing) {
      await db.insert(attendanceStudent)
        .values({ studentId: note.studentId, date: returnDate, status: 'present', markedBy: req.user!.id });
    }

    const student = await db
      .select({ fullName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})` })
      .from(students)
      .where(eq(students.id, note.studentId))
      .limit(1);

    await notify({
      title: 'Student Returned',
      message: `${student[0]?.fullName || 'A student'} has returned from leave and is marked present`,
      type: 'success',
      roles: ['schoolAdmin', 'teacher'],
    });

    await logAudit({
      action: 'return',
      category: 'leave_note',
      entityType: 'leave_note',
      entityId: note.id,
      description: `Student ${student[0]?.fullName || ''} returned from leave — marked present, cleared future absent/excused records`,
      req,
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

export default router;
