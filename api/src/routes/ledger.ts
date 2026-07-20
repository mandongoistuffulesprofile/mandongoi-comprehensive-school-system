import { Router } from 'express';
import { db } from '../db';
import { ledgerAccounts, ledgerEntries, ledgerLines, users, feeInvoices, receipts } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { postJournalEntry, trialBalance } from '../services/ledger';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.query;
    const conditions = [];
    if (type) conditions.push(eq(ledgerAccounts.type, type as any));

    const data = await db.select().from(ledgerAccounts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(ledgerAccounts.code);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { code: req.body.code, name: req.body.name, type: req.body.type };
    const [account] = await db.insert(ledgerAccounts).values(data).returning();
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { code: req.body.code, name: req.body.name, type: req.body.type };
    const [account] = await db.update(ledgerAccounts).set(data).where(eq(ledgerAccounts.id, req.params.id)).returning();
    if (!account) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(ledgerAccounts).where(eq(ledgerAccounts.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.post('/journal', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { entryDate, description, sourceType, sourceId, lines } = req.body;
    if (!entryDate || !sourceType || !Array.isArray(lines) || lines.length === 0) {
      throw new AppError('entryDate, sourceType and a non-empty lines array are required', 400);
    }
    const entry = await postJournalEntry({
      entryDate,
      description,
      sourceType,
      sourceId,
      createdBy: req.user!.id,
      lines,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
});

router.get('/journal', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db
      .select({
        id: ledgerEntries.id,
        entryDate: ledgerEntries.entryDate,
        description: ledgerEntries.description,
        sourceType: ledgerEntries.sourceType,
        createdAt: ledgerEntries.createdAt,
        createdByName: users.name,
        lines: sql`(
          SELECT json_agg(json_build_object(
            'accountId', ll.account_id,
            'accountName', la.name,
            'accountCode', la.code,
            'debit', ll.debit,
            'credit', ll.credit
          ))
          FROM ${ledgerLines} ll
          JOIN ${ledgerAccounts} la ON la.id = ll.account_id
          WHERE ll.ledger_entry_id = ${ledgerEntries.id}
        )`,
      })
      .from(ledgerEntries)
      .leftJoin(users, eq(ledgerEntries.createdBy, users.id))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(50);

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/journal/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [entry] = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.id, req.params.id))
      .limit(1);
    if (!entry) return res.status(404).json({ success: false, error: 'Journal entry not found' });

    if (entry.sourceType === 'feePayment' && entry.sourceId) {
      const [receipt] = await db
        .select()
        .from(receipts)
        .where(eq(receipts.invoiceId, entry.sourceId))
        .limit(1);
      if (receipt) {
        const amount = Number(receipt.amount);
        await db.update(feeInvoices)
          .set({
            amountPaid: sql`GREATEST(0, CAST(${feeInvoices.amountPaid} AS numeric) - ${amount})`,
            balance: sql`CAST(${feeInvoices.totalAmount} AS numeric) - GREATEST(0, CAST(${feeInvoices.amountPaid} AS numeric) - ${amount})`,
            status: sql`CASE WHEN GREATEST(0, CAST(${feeInvoices.amountPaid} AS numeric) - ${amount}) <= 0 THEN 'unpaid'::text ELSE 'partial'::text END`,
          })
          .where(eq(feeInvoices.id, entry.sourceId));
        await db.delete(receipts).where(eq(receipts.id, receipt.id));
      }
    }

    await db.delete(ledgerEntries).where(eq(ledgerEntries.id, req.params.id));

    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

router.get('/trial-balance', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await trialBalance();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
