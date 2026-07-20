import { Router } from 'express';
import { db } from '../db';
import { foodPresets } from '../models/schema';
import { eq, desc } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(foodPresets).orderBy(foodPresets.itemName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [preset] = await db.insert(foodPresets).values({
      itemName: req.body.itemName,
      unitPrice: String(req.body.unitPrice),
      unit: req.body.unit || 'kg',
      stockQuantity: String(req.body.stockQuantity || 0),
      reorderLevel: String(req.body.reorderLevel || 0),
      isActive: req.body.isActive !== false,
    }).returning();
    res.status(201).json({ success: true, data: preset });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [preset] = await db.update(foodPresets).set({
      itemName: req.body.itemName,
      unitPrice: String(req.body.unitPrice),
      unit: req.body.unit,
      stockQuantity: req.body.stockQuantity !== undefined ? String(req.body.stockQuantity) : undefined,
      reorderLevel: req.body.reorderLevel !== undefined ? String(req.body.reorderLevel) : undefined,
      isActive: req.body.isActive,
    }).where(eq(foodPresets.id, req.params.id)).returning();
    if (!preset) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: preset });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(foodPresets).where(eq(foodPresets.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) { next(err); }
});

export default router;
