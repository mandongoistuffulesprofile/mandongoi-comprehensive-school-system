
import { config } from './config';
import { validateConfig } from './config';
import { logger } from './utils/logger';
import { pool } from "./db";
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import * as Sentry from '@sentry/node';

validateConfig();

if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    environment: config.env,
    tracesSampleRate: config.env === 'production' ? 0.1 : 0,
    integrations: [Sentry.expressIntegration()],
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

import authRoutes from './routes/auth';
import studentsRoutes from './routes/students';
import guardiansRoutes from './routes/guardians';
import guardiansBulkRoutes from './routes/guardians-bulk';
import academicRoutes from './routes/academic';
import strandsRoutes from './routes/strands';
import assessmentsRoutes from './routes/assessments';
import reportCardsRoutes from './routes/report-cards';
import feesRoutes from './routes/fees';
import invoicesRoutes, { webhookRouter } from './routes/invoices';
import staffRoutes from './routes/staff';
import staffAttendanceRoutes from './routes/staff-attendance';
import payrollRoutes from './routes/payroll';
import payrollEntriesRoutes from './routes/payroll-entries';
import ledgerRoutes from './routes/ledger';
import attendanceRoutes from './routes/attendance';
import attendanceSummaryRoutes from './routes/attendance-summary';
import curriculumRoutes from './routes/curriculum';
import smsRoutes from './routes/sms';
import smsRecipientsRoutes from './routes/sms-recipients';
import smsLogsRoutes from './routes/sms-logs';
import leaveNotesRoutes from './routes/leave-notes';
import extraDutyRoutes from './routes/extra-duty';
import automatedRulesRoutes from './routes/automated-rules';
import smsTemplatesRoutes from './routes/sms-templates';
import parentLinksRoutes from './routes/parent-links';
import settingsRoutes from './routes/settings';
import paybillsRoutes from './routes/paybills';
import paymentsRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';
import { evaluateAndSend } from './services/sms-scheduler';
import { evaluatePaymentReminders } from './services/payment-reminder';
import { evaluateOverdueInvoices } from './services/overdue-checker';
import { evaluateLowAttendance } from './services/attendance-checker';
import { runFoodConsumption } from './services/food-consumption-scheduler';
import notificationsRoutes from './routes/notifications';
import auditLogsRoutes from './routes/audit-logs';
import uploadRoutes from './routes/uploads';
import classTeachersRoutes from './routes/class-teachers';
import sessionAssignmentsRoutes from './routes/session-assignments';
import foodLogsRoutes from './routes/food-logs';
import foodPresetsRoutes from './routes/food-presets';
import mealTemplatesRoutes from './routes/meal-templates';
import teacherPreferencesRoutes from './routes/teacher-preferences';
import exitNotificationsRoutes from './routes/exit-notifications';
import adminMetricsRoutes from './routes/admin-metrics';

const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
}));
app.use('/api/invoices/mpesa/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many login attempts, please try again later' },
});
app.use('/api/auth', authLimiter);

const webhookLimiter = rateLimit({
  windowMs: 1000,
  max: 5,
  message: { success: false, error: 'Too many webhook requests' },
});
app.use('/api/invoices/mpesa/webhook', webhookLimiter);

app.use((req, res, next) => {
  (req as any).requestId = crypto.randomUUID();
  next();
});


app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use('/api/students', authMiddleware, studentsRoutes);
app.use('/api/guardians', authMiddleware, guardiansRoutes);
app.use('/api/guardians', authMiddleware, guardiansBulkRoutes);
app.use('/api/academic', authMiddleware, academicRoutes);
app.use('/api/strands', authMiddleware, strandsRoutes);
app.use('/api/assessments', authMiddleware, assessmentsRoutes);
app.use('/api/report-cards', authMiddleware, reportCardsRoutes);
app.use('/api/fees', authMiddleware, feesRoutes);
app.use('/api/invoices/mpesa/webhook', webhookRouter);
app.use('/api/invoices', authMiddleware, invoicesRoutes);
app.use('/api/staff', authMiddleware, staffRoutes);
app.use('/api/staff-attendance', authMiddleware, staffAttendanceRoutes);
app.use('/api/payroll', authMiddleware, payrollRoutes);
app.use('/api/payroll-entries', authMiddleware, payrollEntriesRoutes);
app.use('/api/ledger', authMiddleware, ledgerRoutes);
app.use('/api/attendance', authMiddleware, attendanceRoutes);
app.use('/api/attendance', authMiddleware, attendanceSummaryRoutes);
app.use('/api/curriculum', authMiddleware, curriculumRoutes);
app.use('/api/sms', authMiddleware, smsRoutes);
app.use('/api/sms', authMiddleware, smsRecipientsRoutes);
app.use('/api/sms-logs', authMiddleware, smsLogsRoutes);
app.use('/api/automated-rules', authMiddleware, automatedRulesRoutes);
app.use('/api/sms-templates', authMiddleware, smsTemplatesRoutes);
app.use('/api/parent-links', authMiddleware, parentLinksRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/leave-notes', authMiddleware, leaveNotesRoutes);
app.use('/api/extra-duty', authMiddleware, extraDutyRoutes);
app.use('/api/paybills', authMiddleware, paybillsRoutes);
app.use('/api/payments', authMiddleware, paymentsRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/audit-logs', authMiddleware, auditLogsRoutes);
app.use('/api/uploads', authMiddleware, uploadRoutes);
app.use('/api/class-teachers', authMiddleware, classTeachersRoutes);
app.use('/api/session-assignments', authMiddleware, sessionAssignmentsRoutes);
app.use('/api/food-logs', authMiddleware, foodLogsRoutes);
app.use('/api/notifications', authMiddleware, notificationsRoutes);
app.use('/api/food-presets', authMiddleware, foodPresetsRoutes);
app.use('/api/meal-templates', authMiddleware, mealTemplatesRoutes);
app.use('/api/teacher-preferences', authMiddleware, teacherPreferencesRoutes);
app.use('/api/exit-notifications', authMiddleware, exitNotificationsRoutes);
app.use('/api/admin', authMiddleware, adminMetricsRoutes);
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

if (config.sentryDsn) {
  app.use(Sentry.expressErrorHandler() as unknown as express.ErrorRequestHandler);
}
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err, stack: err.stack });
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await pool.end();
  process.exit(0);
});
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await pool.end();
  process.exit(0);
});

const PORT = config.port;

app.listen(PORT, () => {
  const keepAlive = setInterval(() => {
    pool.query("SELECT 1").catch(() => {});
  }, 3 * 60 * 1000);
  logger.info("DB keep-alive started (3-minute interval)");

  logger.info(`Server running on port ${PORT} in ${config.env} mode`);

  setInterval(() => {
    evaluateAndSend().catch((err) => logger.error("SMS scheduler error", { error: err }));
  }, 5 * 60 * 1000);
  logger.info("SMS scheduler started (5-minute interval)");

  setInterval(() => {
    evaluatePaymentReminders().catch((err) => logger.error("Payment reminder error", { error: err }));
  }, 60 * 60 * 1000);
  logger.info("Payment reminder scheduler started (1-hour interval)");

  setInterval(() => {
    evaluateOverdueInvoices().catch((err) => logger.error("Overdue invoice check error", { error: err }));
  }, 60 * 60 * 1000);
  logger.info("Overdue invoice checker started (1-hour interval)");

  setInterval(() => {
    evaluateLowAttendance().catch((err) => logger.error("Low attendance check error", { error: err }));
  }, 6 * 60 * 60 * 1000);
  logger.info("Low attendance checker started (6-hour interval)");

  runFoodConsumption().catch((err) => logger.error("Initial food consumption error", { error: err }));
  setInterval(() => {
    runFoodConsumption().catch((err) => logger.error("Food consumption error", { error: err }));
  }, 30 * 60 * 1000);
  logger.info("Food consumption scheduler started (30-minute interval)");
});
