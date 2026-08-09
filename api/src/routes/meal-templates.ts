import { Router } from 'express';
import { db } from '../db';
import { mealTemplates, foodPresets } from '../models/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const MEALS = ['breakfast', 'lunch', 'supper'] as const;

router.get('/', requireRole('schoolAdmin', 'teacher'), async (req: AuthRequest, res, next) => {
  try {
    const { term, academicYear } = req.query;
    const conditions = [];

    if (term) conditions.push(eq(mealTemplates.term, Number(term)));
    if (academicYear) conditions.push(eq(mealTemplates.academicYear, Number(academicYear)));

    const data = await db
      .select({
        id: mealTemplates.id,
        dayOfWeek: mealTemplates.dayOfWeek,
        mealType: mealTemplates.mealType,
        presetId: mealTemplates.presetId,
        fixedQuantity: mealTemplates.fixedQuantity,
        isActive: mealTemplates.isActive,
        term: mealTemplates.term,
        academicYear: mealTemplates.academicYear,
        createdAt: mealTemplates.createdAt,
        itemName: foodPresets.itemName,
        unit: foodPresets.unit,
        unitPrice: foodPresets.unitPrice,
      })
      .from(mealTemplates)
      .innerJoin(foodPresets, eq(mealTemplates.presetId, foodPresets.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(mealTemplates.dayOfWeek, mealTemplates.mealType);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { dayOfWeek, mealType, presetId, fixedQuantity, term, academicYear } = req.body;

    if (!dayOfWeek || !mealType || !presetId || !fixedQuantity || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        error: 'dayOfWeek, mealType, presetId, fixedQuantity, term, and academicYear are required',
      });
    }

    if (!DAYS.includes(dayOfWeek)) {
      return res.status(400).json({ success: false, error: `Invalid dayOfWeek. Must be one of: ${DAYS.join(', ')}` });
    }
    if (!MEALS.includes(mealType)) {
      return res.status(400).json({ success: false, error: `Invalid mealType. Must be one of: ${MEALS.join(', ')}` });
    }

    const [preset] = await db.select().from(foodPresets).where(eq(foodPresets.id, presetId)).limit(1);
    if (!preset) return res.status(404).json({ success: false, error: 'Food preset not found' });

    const [template] = await db
      .insert(mealTemplates)
      .values({
        dayOfWeek,
        mealType,
        presetId,
        fixedQuantity: String(fixedQuantity),
        term: Number(term),
        academicYear: Number(academicYear),
      })
      .returning();

    res.status(201).json({ success: true, data: template });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ success: false, error: 'This food item is already in this meal slot' });
    }
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { fixedQuantity, isActive } = req.body;
    const updates: any = {};
    if (fixedQuantity !== undefined) updates.fixedQuantity = String(fixedQuantity);
    if (isActive !== undefined) updates.isActive = isActive;

    const [template] = await db
      .update(mealTemplates)
      .set(updates)
      .where(eq(mealTemplates.id, req.params.id))
      .returning();

    if (!template) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const [existing] = await db.select().from(mealTemplates).where(eq(mealTemplates.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

    await db.delete(mealTemplates).where(eq(mealTemplates.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const { items, term, academicYear } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items array is required' });
    }
    if (!term || !academicYear) {
      return res.status(400).json({ success: false, error: 'term and academicYear are required' });
    }

    for (const item of items) {
      if (!DAYS.includes(item.dayOfWeek) || !MEALS.includes(item.mealType) || !item.presetId || !item.fixedQuantity) {
        return res.status(400).json({
          success: false,
          error: `Invalid item: each must have dayOfWeek, mealType, presetId, fixedQuantity`,
        });
      }
    }

    const created = [];
    for (const item of items) {
      try {
        const [template] = await db
          .insert(mealTemplates)
          .values({
            dayOfWeek: item.dayOfWeek,
            mealType: item.mealType,
            presetId: item.presetId,
            fixedQuantity: String(item.fixedQuantity),
            term: Number(term),
            academicYear: Number(academicYear),
          })
          .onConflictDoUpdate({
            target: [mealTemplates.dayOfWeek, mealTemplates.mealType, mealTemplates.presetId, mealTemplates.term, mealTemplates.academicYear],
            set: { fixedQuantity: String(item.fixedQuantity), isActive: true },
          })
          .returning();
        created.push(template);
      } catch (err: any) {
        if (err?.code !== '23505') {
          logger.error('Bulk meal template insert failed', { item, error: err });
        }
      }
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

export default router;
