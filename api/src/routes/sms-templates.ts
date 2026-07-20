import { Router } from 'express';
import { db } from '../db';
import { smsTemplates } from '../models/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { type, isActive } = req.query;
    const conditions = [];
    if (type) conditions.push(eq(smsTemplates.type, type as any));
    if (isActive !== undefined) conditions.push(eq(smsTemplates.isActive, isActive === 'true'));

    const data = await db.select().from(smsTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(smsTemplates.name);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { name, type, content, variables, language, isDefault, isActive } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, error: 'name and content are required' });
    }
    const [row] = await db.insert(smsTemplates).values({
      name,
      type: type || 'custom',
      content,
      variables: variables ?? [],
      language: language ?? 'en',
      isDefault: isDefault ?? false,
      isActive: isActive ?? true,
    }).returning();
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, type: req.body.type, content: req.body.content, variables: req.body.variables, language: req.body.language, isDefault: req.body.isDefault, isActive: req.body.isActive };
    const [row] = await db.update(smsTemplates)
      .set(data)
      .where(eq(smsTemplates.id, req.params.id))
      .returning();
    if (!row) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(smsTemplates).where(eq(smsTemplates.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
