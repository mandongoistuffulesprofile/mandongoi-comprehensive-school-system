import { Router } from 'express';
import { db } from '../db';
import { guardians, students, feeInvoices, smsTemplates, schoolSettings } from '../models/schema';
import { eq, and, inArray, sql, desc, ne } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { sendSmsMessages, type SmsRecipient } from '../services/sms';

const router = Router();

router.post('/query-recipients', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { grade, feeStatus, guardianIds, allGuardians } = req.body as {
      grade?: string;
      feeStatus?: 'overdue' | 'unpaid' | 'partial' | 'paid';
      guardianIds?: string[];
      allGuardians?: boolean;
    };

    let guardianList: { id: string; name: string; phone: string; studentName?: string; balance?: string }[] = [];

    if (guardianIds && guardianIds.length > 0) {
      const result = await db
        .select({
          id: guardians.id,
          name: guardians.name,
          phone: guardians.phone,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
          studentId: students.id,
        })
        .from(guardians)
        .innerJoin(students, eq(guardians.studentId, students.id))
        .where(and(inArray(guardians.id, guardianIds), eq(guardians.smsOptOut, false)));
      guardianList = result;
    } else if (allGuardians) {
      const result = await db
        .select({
          id: guardians.id,
          name: guardians.name,
          phone: guardians.phone,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
          studentId: students.id,
        })
        .from(guardians)
        .innerJoin(students, eq(guardians.studentId, students.id))
        .where(eq(guardians.smsOptOut, false));
      guardianList = result;
    } else {
      const conditions = [eq(guardians.smsOptOut, false)];
      if (grade) {
        conditions.push(eq(students.grade, grade));
      }

      let baseQuery = db
        .select({
          id: guardians.id,
          name: guardians.name,
          phone: guardians.phone,
          studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
          studentId: students.id,
        })
        .from(guardians)
        .innerJoin(students, eq(guardians.studentId, students.id))
        .where(and(...conditions));

      let result = await baseQuery;

      if (feeStatus) {
        let feeCondition;
        if (feeStatus === 'overdue') {
          feeCondition = sql`balance > 0 AND balance < total_amount AND due_date < NOW()`;
        } else if (feeStatus === 'unpaid') {
          feeCondition = sql`status = 'unpaid'`;
        } else if (feeStatus === 'partial') {
          feeCondition = sql`status = 'partial'`;
        } else if (feeStatus === 'paid') {
          feeCondition = sql`status = 'paid'`;
        }

        const studentsWithStatus = await db
          .select({ studentId: feeInvoices.studentId })
          .from(feeInvoices)
          .where(feeCondition!);

        const filteredIds = new Set(studentsWithStatus.map(s => s.studentId));
        result = result.filter(r => filteredIds.has(r.studentId));
      }

      guardianList = result;
    }

    res.json({ success: true, data: guardianList, total: guardianList.length });
  } catch (err) {
    next(err);
  }
});

router.post('/send-targeted', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { recipients, message, templateId, campaignId } = req.body as {
      recipients: { guardianId: string; phone: string; name: string; studentName?: string; studentId?: string }[];
      message: string;
      templateId?: string;
      campaignId?: string;
    };

    if (!recipients?.length || !message) {
      throw new AppError('Recipients and message are required', 400);
    }

    const [settings] = await db.select().from(schoolSettings).limit(1);

    const smsRecipients: SmsRecipient[] = await Promise.all(recipients.map(async (r) => {
      let msg = message
        .replace(/{guardianName}/g, r.name)
        .replace(/{studentName}/g, r.studentName || '');

      if (settings) {
        msg = msg
          .replace(/{schoolName}/g, settings.schoolName ?? '')
          .replace(/{term}/g, settings.currentTerm ?? '')
          .replace(/{currentTerm}/g, settings.currentTerm ?? '')
          .replace(/{academicYear}/g, settings.currentAcademicYear ?? '')
          .replace(/{termStartDate}/g, settings.termStartDate ? new Date(settings.termStartDate).toLocaleDateString('en-KE') : '')
          .replace(/{termEndDate}/g, settings.termEndDate ? new Date(settings.termEndDate).toLocaleDateString('en-KE') : '')
          .replace(/{nextTermStartDate}/g, settings.nextTermStartDate ? new Date(settings.nextTermStartDate).toLocaleDateString('en-KE') : '')
          .replace(/{schoolMotto}/g, settings.schoolMotto ?? '');
      }

      let sid = r.studentId;
      if (!sid && r.guardianId) {
        const [g] = await db.select().from(guardians).where(eq(guardians.id, r.guardianId)).limit(1);
        if (g) sid = g.studentId;
      }
      if (sid && (msg.includes('{balance}') || msg.includes('{dueDate}') || msg.includes('{totalAmount}') || msg.includes('{amountPaid}'))) {
        const [invoice] = await db
          .select()
          .from(feeInvoices)
          .where(and(
            eq(feeInvoices.studentId, sid),
            sql`${feeInvoices.status} IN ('unpaid', 'partial', 'overdue')`,
          ))
          .orderBy(desc(feeInvoices.dueDate))
          .limit(1);
        if (invoice) {
          msg = msg
            .replace(/{balance}/g, String(invoice.balance))
            .replace(/{dueDate}/g, invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-KE') : '—')
            .replace(/{totalAmount}/g, String(invoice.totalAmount))
            .replace(/{amountPaid}/g, String(invoice.amountPaid));
        } else {
          const [paid] = await db
            .select()
            .from(feeInvoices)
            .where(and(eq(feeInvoices.studentId, sid), eq(feeInvoices.status, 'paid')))
            .limit(1);
          if (paid) {
            msg = msg
              .replace(/{balance}/g, '0')
              .replace(/{dueDate}/g, '—')
              .replace(/{totalAmount}/g, String(paid.totalAmount))
              .replace(/{amountPaid}/g, String(paid.amountPaid));
          }
        }
      }

      return {
        recipientId: r.guardianId,
        recipientType: 'guardian' as const,
        phoneNumber: r.phone,
        message: msg,
        templateId: templateId || undefined,
        campaignId: campaignId || undefined,
      };
    }));

    const logs = await sendSmsMessages(smsRecipients);
    res.status(201).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

router.get('/grades', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const result = await db.select({ grade: students.grade }).from(students).groupBy(students.grade).orderBy(students.grade);
    res.json({ success: true, data: result.map(r => r.grade) });
  } catch (err) {
    next(err);
  }
});

router.get('/guardians', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const result = await db
      .select({
        id: guardians.id,
        name: guardians.name,
        phone: guardians.phone,
        studentName: sql<string>`concat(${students.firstName}, ' ', ${students.lastName})`,
        grade: students.grade,
      })
      .from(guardians)
      .innerJoin(students, eq(guardians.studentId, students.id))
      .where(eq(guardians.smsOptOut, false))
      .orderBy(students.grade, guardians.name);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
