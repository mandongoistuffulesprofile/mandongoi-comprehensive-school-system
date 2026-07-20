import { Router } from 'express';
import { db } from '../db';
import { paybills } from '../models/schema';
import { eq } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(paybills).orderBy(paybills.name);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, shortcode: req.body.shortcode, accountReferenceFormat: req.body.accountReferenceFormat, purpose: req.body.purpose, darajaConsumerKeyRef: req.body.darajaConsumerKeyRef, darajaConsumerSecretRef: req.body.darajaConsumerSecretRef, darajaPasskeyRef: req.body.darajaPasskeyRef, isActive: req.body.isActive };
    const [paybill] = await db.insert(paybills).values(data).returning();
    res.status(201).json({ success: true, data: paybill });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, shortcode: req.body.shortcode, accountReferenceFormat: req.body.accountReferenceFormat, purpose: req.body.purpose, darajaConsumerKeyRef: req.body.darajaConsumerKeyRef, darajaConsumerSecretRef: req.body.darajaConsumerSecretRef, darajaPasskeyRef: req.body.darajaPasskeyRef, isActive: req.body.isActive };
    const [paybill] = await db.update(paybills).set(data).where(eq(paybills.id, req.params.id)).returning();
    if (!paybill) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: paybill });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(paybills).where(eq(paybills.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
