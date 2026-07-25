import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireRole } from '../middleware/rbac';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { uploadFile } from '../services/upload';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads/signatures');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

const useR2 = !!(config.r2.endpoint && config.r2.accessKeyId && config.r2.secretAccessKey);

router.post('/signature', requireRole('schoolAdmin'), (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.single('signature')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(400).json({ success: false, error: 'File too large or invalid type' });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    if (useR2) {
      try {
        const buffer = fs.readFileSync(req.file.path);
        const url = await uploadFile(buffer, req.file.originalname, req.file.mimetype);
        fs.unlink(req.file.path, () => {});
        return res.status(201).json({ success: true, data: { url, filename: path.basename(url) } });
      } catch (r2Err) {
        const url = `/uploads/signatures/${req.file.filename}`;
        return res.status(201).json({ success: true, data: { url, filename: req.file.filename, storage: 'local' } });
      }
    }

    const url = `/uploads/signatures/${req.file.filename}`;
    res.status(201).json({ success: true, data: { url, filename: req.file.filename, storage: 'local' } });
  });
});

export default router;
