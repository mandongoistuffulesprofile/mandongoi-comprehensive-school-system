import { Router } from 'express';
import { db } from '../db';
import { smsCampaigns } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { sendSmsMessages, SmsRecipient } from '../services/sms';
import { AppError } from '../middleware/errorHandler';
import { notify } from '../services/notify';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { status, type } = req.query;
    const conditions = [];
    if (status) conditions.push(eq(smsCampaigns.status, status as any));
    if (type) conditions.push(eq(smsCampaigns.type, type as any));

    const data = await db.select().from(smsCampaigns)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(smsCampaigns.sentAt));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, type: req.body.type, targetFilter: req.body.targetFilter, templateId: req.body.templateId, message: req.body.message, recipientCount: req.body.recipientCount, status: req.body.status, scheduledAt: req.body.scheduledAt };
    const [campaign] = await db.insert(smsCampaigns).values(data).returning();
    res.status(201).json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/send', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [campaign] = await db.update(smsCampaigns).set({ status: 'sending', sentBy: req.user!.id }).where(eq(smsCampaigns.id, req.params.id)).returning();
    if (!campaign) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
});

router.post('/send', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { recipients } = req.body as { recipients: SmsRecipient[] };
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError('A non-empty recipients array is required', 400);
    }
    const logs = await sendSmsMessages(recipients);
    const sent = logs.filter(l => l.status === 'sent').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    if (failed > 0) {
      notify({
        title: `SMS Delivery ${failed > 0 && sent === 0 ? 'Failed' : 'Partially Failed'}`,
        message: `${sent} message(s) sent, ${failed} failed to deliver.`,
        type: failed > 0 && sent === 0 ? 'error' : 'warning',
        link: '/sms/logs',
      });
    }
    res.status(201).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

export default router;
