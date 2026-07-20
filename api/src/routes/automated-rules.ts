import { Router } from 'express';
import { db } from '../db';
import { automatedSmsRules } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { isActive, triggerType } = req.query;
    const conditions = [];
    if (isActive !== undefined) conditions.push(eq(automatedSmsRules.isActive, isActive === 'true'));
    if (triggerType) conditions.push(eq(automatedSmsRules.triggerType, triggerType as any));

    const data = await db.select().from(automatedSmsRules)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(automatedSmsRules.name);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, triggerType: req.body.triggerType, conditions: req.body.conditions, templateId: req.body.templateId, isActive: req.body.isActive };
    const [rule] = await db.insert(automatedSmsRules).values(data).returning();
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = {
      name: req.body.name,
      triggerType: req.body.triggerType,
      conditions: req.body.conditions,
      templateId: req.body.templateId,
      isActive: req.body.isActive,
      lastRunAt: req.body.lastRunAt ? new Date(req.body.lastRunAt) : undefined,
    };
    const [rule] = await db.update(automatedSmsRules).set(data).where(eq(automatedSmsRules.id, req.params.id)).returning();
    if (!rule) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
});

export default router;
