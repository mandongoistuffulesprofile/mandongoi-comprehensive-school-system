import { Router } from 'express';
import { db } from '../db';
import { learningAreas } from '../models/schema';
import { eq, and, sql, not } from 'drizzle-orm';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';

const LEVEL_GRADES: Record<string, string[]> = {
  pre_primary: ['PP1', 'PP2'],
  comprehensive: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'],
};

const router = Router();

router.get('/by-level', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const { level } = req.query as { level?: string };
    const gradeMap: Record<string, string[]> = { pre_primary: ['PP1', 'PP2'], comprehensive: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] };
    const grades = gradeMap[level || ''];
    if (!grades) { res.json({ success: true, data: [] }); return; }
    const data = await db.select().from(learningAreas).where(sql`${learningAreas.gradeLevels} && ARRAY[${sql.join(grades.map(g => sql`${g}`), sql`, `)}]`).orderBy(learningAreas.name);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireRole('schoolAdmin', 'teacher', 'accountant'), async (req: AuthRequest, res, next) => {
  try {
    const data = await db.select().from(learningAreas).orderBy(learningAreas.name);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

const CBC_SUBJECTS: { name: string; gradeLevels: string[] }[] = [
  { name: 'Indigenous Language / Literacy Activities', gradeLevels: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'English Language Activities', gradeLevels: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'Kiswahili Language Activities', gradeLevels: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'Mathematical Activities', gradeLevels: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'Environmental Activities', gradeLevels: ['Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'Creative Activities', gradeLevels: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'Pastoral Program Instruction (PPI)', gradeLevels: ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'] },
  { name: 'English', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
  { name: 'Kiswahili', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
  { name: 'Mathematics', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
  { name: 'Science and Technology', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
  { name: 'Social Studies', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
  { name: 'Agriculture and Nutrition', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
  { name: 'Creative Arts', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6'] },
  { name: 'Religious Education (CRE / IRE / HRE)', gradeLevels: ['Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'] },
  { name: 'Integrated Science', gradeLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
  { name: 'Pre-Technical and Pre-Career Education', gradeLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
  { name: 'Creative Arts and Sports', gradeLevels: ['Grade 7', 'Grade 8', 'Grade 9'] },
];

router.post('/seed', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    let created = 0;
    for (const subj of CBC_SUBJECTS) {
      const [existing] = await db.select().from(learningAreas).where(eq(learningAreas.name, subj.name)).limit(1);
      if (!existing) {
        await db.insert(learningAreas).values(subj);
        created++;
      }
    }
    res.json({ success: true, data: { created, total: CBC_SUBJECTS.length } });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, gradeLevels: req.body.gradeLevels };
    const [area] = await db.insert(learningAreas).values(data).returning();
    res.status(201).json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    const data = { name: req.body.name, gradeLevels: req.body.gradeLevels };
    const [area] = await db.update(learningAreas).set(data).where(eq(learningAreas.id, req.params.id)).returning();
    if (!area) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: area });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('schoolAdmin'), async (req: AuthRequest, res, next) => {
  try {
    await db.delete(learningAreas).where(eq(learningAreas.id, req.params.id));
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
