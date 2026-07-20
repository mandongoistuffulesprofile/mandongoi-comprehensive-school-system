import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole, requireOwnInvoice } from '../middleware/rbac';
import { AppError } from '../middleware/errorHandler';
import {
  listInvoices,
  generateInvoice,
  generateBulkInvoices,
  recordManualPayment,
  applyMpesaWebhook,
  getInvoiceReceipts,
  manualMatchTransaction,
  listUnmatchedTransactions,
} from '../services/fees';
import { initiateStkPush } from '../services/mpesa';
import { parseSafaricomPayload, registerC2BUrls } from '../services/mpesa-webhook';
import { parsePagination, paginatedResult } from '../utils/pagination';
import { logger } from '../utils/logger';

const router = Router();

function verifyMpesaSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-safaricom-signature'] as string | undefined;

  if (config.mpesa.environment !== 'production') {
    return next();
  }

  if (!signature) {
    return res.status(401).json({ success: false, error: 'Missing M-Pesa signature header' });
  }

  const raw = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', config.mpesa.passkey)
    .update(raw)
    .digest('base64');

  if (signature !== expected) {
    logger.error('M-Pesa webhook HMAC verification failed', { signature, expected });
    return res.status(401).json({ success: false, error: 'Invalid M-Pesa signature' });
  }

  next();
}

export const webhookRouter = Router();
webhookRouter.post('/', verifyMpesaSignature, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = parseSafaricomPayload(req.body);
    if (!parsed) {
      return res.status(400).json({ success: false, error: 'Unrecognised M-Pesa payload format' });
    }
    const result = await applyMpesaWebhook(parsed);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/', authMiddleware, requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, status, term, academicYear, balance } = req.query;
    const { page, limit } = parsePagination(req.query as Record<string, unknown>);
    const { data, count } = await listInvoices({
      studentId: studentId as string | undefined,
      status: status as string | undefined,
      term: term ? Number(term) : undefined,
      academicYear: academicYear ? Number(academicYear) : undefined,
      balanceFilter: balance as 'pending' | 'paid' | 'overdue' | undefined,
      page,
      limit,
    });
    res.json({ success: true, ...paginatedResult(data, count, page, limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/generate', authMiddleware, requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { studentId, feeStructureId, dueDate } = req.body;
    if (!studentId || !feeStructureId) {
      throw new AppError('studentId and feeStructureId are required', 400);
    }
    const invoice = await generateInvoice({ studentId, feeStructureId, dueDate });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

router.post('/generate-bulk', authMiddleware, requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { feeStructureId } = req.body;
    if (!feeStructureId) {
      throw new AppError('feeStructureId is required', 400);
    }
    const result = await generateBulkInvoices(feeStructureId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/payment', authMiddleware, requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { amount, paymentMethod, mpesaTransactionId } = req.body;
    if (!amount || !paymentMethod) {
      throw new AppError('amount and paymentMethod are required', 400);
    }
    const result = await recordManualPayment({
      invoiceId: req.params.id,
      amount: Number(amount),
      paymentMethod,
      mpesaTransactionId,
      issuedBy: req.user!.id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/receipts', authMiddleware, requireRole('schoolAdmin', 'accountant'), requireOwnInvoice((r) => r.params.id), async (req: AuthRequest, res, next) => {
  try {
    const data = await getInvoiceReceipts(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/mpesa/stk-push', authMiddleware, requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { phoneNumber, amount, accountReference, description } = req.body;
    const result = await initiateStkPush({ phoneNumber, amount, accountReference, description });
    res.status(202).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/mpesa/register-c2b', authMiddleware, requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { paybillShortcode } = req.body;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const confirmationUrl = `${baseUrl}/api/invoices/mpesa/webhook`;
    const result = await registerC2BUrls(paybillShortcode || config.mpesa.shortcode, confirmationUrl);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/mpesa/simulate', authMiddleware, requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { amount, phone, accountRef } = req.body;
    const simulatedC2B = {
      TransID: `SIM${Date.now().toString(36).toUpperCase()}`,
      TransAmount: String(amount || 100),
      MSISDN: phone || '254712345678',
      BillRefNumber: accountRef || 'TestStudent-Grade4',
      TransTime: new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14),
    };
    const parsed = parseSafaricomPayload(simulatedC2B);
    if (!parsed) return res.status(400).json({ success: false, error: 'Simulation failed' });
    const result = await applyMpesaWebhook(parsed);
    res.json({ success: true, data: result, simulated: simulatedC2B });
  } catch (err) {
    next(err);
  }
});

router.get("/mpesa/unmatched", authMiddleware, requireRole("schoolAdmin", "accountant"), async (req: AuthRequest, res, next) => {
  try {
    const data = await listUnmatchedTransactions();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/mpesa/match", authMiddleware, requireRole("schoolAdmin"), async (req: AuthRequest, res, next) => {
  try {
    const { transactionId, invoiceId } = req.body;
    if (!transactionId || !invoiceId) throw new AppError("transactionId and invoiceId are required", 400);
    const data = await manualMatchTransaction(transactionId, invoiceId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
export default router;
