import { Router } from 'express';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { guardians } from '../models/schema';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

const bulkCreateSchema = z.object({
  studentId: z.string().uuid(),
  guardians: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        relationship: z.string().optional(),
        isPrimary: z.boolean().optional(),
        preferredLanguage: z.enum(['sw', 'en']).optional(),
        smsOptOut: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(20),
});

router.post(
  '/bulk',
  requireRole('schoolAdmin'),
  validate(bulkCreateSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { studentId, guardians: guardiansList } = req.body as z.infer<typeof bulkCreateSchema>;
      const inserted = await db
        .insert(guardians)
        .values(
          guardiansList.map((g) => ({
            studentId,
            name: g.name,
            phone: g.phone,
            relationship: g.relationship || null,
            isPrimary: g.isPrimary || false,
            preferredLanguage: g.preferredLanguage || 'en',
            smsOptOut: g.smsOptOut || false,
          })),
        )
        .returning();
      res.status(201).json({ success: true, data: inserted });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
