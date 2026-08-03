import { Router } from 'express';
import { db } from '../db';
import { ledgerAccounts, ledgerEntries, ledgerLines, users, feeInvoices, receipts } from '../models/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { postJournalEntry, trialBalance, listJournalEntries, getJournalEntryById, updateJournalEntry } from '../services/ledger';

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
    const result = await listJournalEntries({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      search: (req.query.search as string) || "",
      sourceType: req.query.sourceType as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      minAmount: req.query.minAmount ? Number(req.query.minAmount) : undefined,
    });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) { next(err); }
});

router.get('/journal/:id', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const entry = await getJournalEntryById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'Journal entry not found' });
    res.json({ success: true, data: entry });
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

router.put('/journal/:id', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const [entry] = await db.select().from(ledgerEntries).where(eq(ledgerEntries.id, req.params.id)).limit(1);
    if (!entry) return res.status(404).json({ success: false, error: 'Journal entry not found' });
    if (entry.sourceType !== 'manual') {
      return res.status(400).json({ success: false, error: 'Only manual entries can be edited' });
    }

    const { entryDate, description, lines } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ success: false, error: 'Lines array is required' });
    }

    const updated = await updateJournalEntry(req.params.id, {
      entryDate: entryDate || entry.entryDate,
      description: description ?? entry.description ?? '',
      lines: lines.map((l: any) => ({ accountId: l.accountId, debit: l.debit || 0, credit: l.credit || 0 })),
    });

    res.json({ success: true, data: updated });
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
