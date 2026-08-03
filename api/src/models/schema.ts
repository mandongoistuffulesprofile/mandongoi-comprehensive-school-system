import { pgTable, uuid, text, boolean, timestamp, smallint, integer, numeric, jsonb, index, uniqueIndex, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['schoolAdmin', 'teacher', 'accountant', 'parent'] }).notNull(),
  permissions: text('permissions').array().default([]),
  isActive: boolean('is_active').default(true),
  mustResetPassword: boolean('must_reset_password').default(false),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  admissionNumber: text('admission_number'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),
  gender: text('gender'),
  level: text('level', { enum: ['pre_primary', 'comprehensive'] }).notNull().default('comprehensive'),
  grade: text('grade').notNull(),
  class: text('class'),
  enrollmentDate: timestamp('enrollment_date', { mode: 'date' }),
  nemisId: text('nemis_id'),
  studentType: text('student_type', { enum: ['boarding', 'day'] }).notNull().default('day'),
  boardingHouse: text('boarding_house'),
  foodProgramType: text('food_program_type', { enum: ['bring_own', 'pay_fee', 'none'] }).notNull().default('none'),
  status: text('status', { enum: ['active', 'transferred', 'graduated', 'withdrawn'] }).notNull().default('active'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const guardians = pgTable('guardians', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  relationship: text('relationship'),
  isPrimary: boolean('is_primary').default(false),
  preferredLanguage: text('preferred_language', { enum: ['sw', 'en'] }).default('en'),
  smsOptOut: boolean('sms_opt_out').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentIdx: index('idx_guardians_student').on(table.studentId),
  phoneIdx: index('idx_guardians_phone').on(table.phone),
}));

export const learningAreas = pgTable('learning_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  gradeLevels: text('grade_levels').array().notNull(),
});

export const strands = pgTable('strands', {
  id: uuid('id').primaryKey().defaultRandom(),
  learningAreaId: uuid('learning_area_id').notNull().references(() => learningAreas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
});

export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  learningAreaId: uuid('learning_area_id').notNull().references(() => learningAreas.id),
  strandId: uuid('strand_id').references(() => strands.id),
  term: smallint('term').notNull(),
  academicYear: smallint('academic_year').notNull(),
  type: text('type', { enum: ['formative', 'summative'] }).notNull(),
  performanceLevel: smallint('performance_level'),
  score: numeric('score', { precision: 5, scale: 2 }),
  remarks: text('remarks'),
  assessedBy: uuid('assessed_by').references(() => users.id),
  assessedAt: timestamp('assessed_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentTermIdx: index('idx_assessments_student_term').on(table.studentId, table.term, table.academicYear),
  uniqueAssessment: unique('uq_assessment_student_subject_term').on(table.studentId, table.learningAreaId, table.term, table.academicYear, table.type),
}));

export const reportCards = pgTable('report_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  term: smallint('term').notNull(),
  academicYear: smallint('academic_year').notNull(),
  compiledResults: jsonb('compiled_results').notNull(),
  teacherComments: text('teacher_comments'),
  headTeacherComments: text('head_teacher_comments'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  generatedBy: uuid('generated_by').references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => ({
  uniqueReportCard: uniqueIndex('idx_report_card_unique').on(table.studentId, table.term, table.academicYear),
}));

export const feeStructures = pgTable('fee_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  grade: text('grade').notNull(),
  term: smallint('term').notNull(),
  academicYear: smallint('academic_year').notNull(),
  status: text('status', { enum: ['draft', 'active'] }).notNull().default('active'),
  studentType: text('student_type', { enum: ['boarding', 'day', 'both'] }).notNull().default('both'),
  tuitionAmount: numeric('tuition_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  activityAmount: numeric('activity_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  adminLevyAmount: numeric('admin_levy_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  boardingAmount: numeric('boarding_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  foodAmount: numeric('food_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
});

export const feeInvoices = pgTable('fee_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  feeStructureId: uuid('fee_structure_id').notNull().references(() => feeStructures.id),
  term: smallint('term').notNull(),
  academicYear: smallint('academic_year').notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  balance: numeric('balance', { precision: 10, scale: 2 }).notNull().default('0'),
  dueDate: timestamp('due_date', { mode: 'date' }),
  status: text('status', { enum: ['unpaid', 'partial', 'paid', 'overdue'] }).notNull().default('unpaid'),
  lastReminderDate: timestamp('last_reminder_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  studentIdIdx: index('idx_fee_invoices_student_id').on(table.studentId),
  feeStructureIdIdx: index('idx_fee_invoices_fee_structure_id').on(table.feeStructureId),
}));

export const foodPresets = pgTable('food_presets', {
  id: uuid('id').primaryKey().defaultRandom(),
  itemName: text('item_name').notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').notNull().default('kg'),
  stockQuantity: numeric('stock_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  reorderLevel: numeric('reorder_level', { precision: 10, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const mealTemplates = pgTable('meal_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  dayOfWeek: text('day_of_week', { enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }).notNull(),
  mealType: text('meal_type', { enum: ['breakfast', 'lunch', 'supper'] }).notNull(),
  presetId: uuid('preset_id').references(() => foodPresets.id).notNull(),
  fixedQuantity: numeric('fixed_quantity', { precision: 8, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  term: smallint('term').notNull(),
  academicYear: smallint('academic_year').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  mealUnique: unique('uq_meal_template').on(table.dayOfWeek, table.mealType, table.presetId, table.term, table.academicYear),
}));

export const foodLogs = pgTable('food_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }),
  presetId: uuid('preset_id').references(() => foodPresets.id),
  itemName: text('item_name').notNull(),
  type: text('type', { enum: ['contribution', 'purchase', 'consumption', 'wastage', 'payment'] }).notNull().default('consumption'),
  quantity: numeric('quantity', { precision: 8, scale: 2 }).notNull().default('1'),
  unit: text('unit').notNull().default('kg'),
  estimatedValue: numeric('estimated_value', { precision: 10, scale: 2 }).notNull().default('0'),
  loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow(),
  loggedBy: uuid('logged_by').references(() => users.id),
  notes: text('notes'),
  term: smallint('term').notNull(),
  academicYear: smallint('academic_year').notNull(),
}, (table) => ({
  studentIdx: index('idx_food_logs_student').on(table.studentId),
  termIdx: index('idx_food_logs_term').on(table.term, table.academicYear),
}));

export const paybills = pgTable('paybills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  shortcode: text('shortcode').notNull().unique(),
  accountReferenceFormat: text('account_reference_format').notNull(),
  purpose: text('purpose', { enum: ['tuition', 'trip', 'event', 'custom'] }).notNull(),
  darajaConsumerKeyRef: text('daraja_consumer_key_ref').notNull(),
  darajaConsumerSecretRef: text('daraja_consumer_secret_ref').notNull(),
  darajaPasskeyRef: text('daraja_passkey_ref').notNull(),
  isActive: boolean('is_active').default(true),
});

export const mpesaTransactions = pgTable('mpesa_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paybillId: uuid('paybill_id').notNull().references(() => paybills.id),
  sourceType: text('source_type', { enum: ['fee', 'trip', 'other'] }).notNull().default('fee'),
  transactionId: text('transaction_id').notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  phoneNumber: text('phone_number').notNull(),
  accountReference: text('account_reference').notNull(),
  transactionDate: timestamp('transaction_date', { withTimezone: true }).notNull(),
  matchedStudentId: uuid('matched_student_id').references(() => students.id),
  matchedInvoiceId: uuid('matched_invoice_id').references(() => feeInvoices.id),
  matchStatus: text('match_status', { enum: ['auto-matched', 'unmatched', 'manually-matched', 'disputed'] }).notNull().default('unmatched'),
  rawPayload: jsonb('raw_payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  paybillIdIdx: index('idx_mpesa_transactions_paybill_id').on(table.paybillId),
  matchedStudentIdIdx: index('idx_mpesa_transactions_matched_student_id').on(table.matchedStudentId),
  matchedInvoiceIdIdx: index('idx_mpesa_transactions_matched_invoice_id').on(table.matchedInvoiceId),
}));

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull().references(() => feeInvoices.id),
  mpesaTransactionId: uuid('mpesa_transaction_id').references(() => mpesaTransactions.id),
  receiptNumber: numeric('receipt_number', { precision: 10, scale: 0 }).unique().notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method', { enum: ['mpesa', 'cash', 'bank'] }).notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow(),
  issuedBy: uuid('issued_by').references(() => users.id),
}, (table) => ({
  invoiceIdIdx: index('idx_receipts_invoice_id').on(table.invoiceId),
}));

export const staff = pgTable('staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  role: text('role', { enum: ['teacher', 'support'] }).notNull(),
  contractType: text('contract_type', { enum: ['tsc_permanent', 'bom', 'intern', 'attachment'] }).notNull().default('tsc_permanent'),
  tscNumber: text('tsc_number'),
  contractStartDate: timestamp('contract_start_date', { mode: 'date' }),
  contractEndDate: timestamp('contract_end_date', { mode: 'date' }),
  maxWeeklyLessons: smallint('max_weekly_lessons').notNull().default(30),
  teacherType: text('teacher_type', { enum: ['bom', 'tsc'] }).notNull().default('tsc'),
  employmentType: text('employment_type', { enum: ['flatRate', 'sessionBased'] }).notNull(),
  baseRate: numeric('base_rate', { precision: 10, scale: 2 }).notNull(),
  extraSessionRate: numeric('extra_session_rate', { precision: 10, scale: 2 }),
  subjects: text('subjects').array().default([]),
  payoutRef: text('payout_ref'),
  isActive: boolean('is_active').default(true),
});

export const attendanceStaff = pgTable('attendance_staff', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  sessionsTaught: smallint('sessions_taught').default(0),
  status: text('status', { enum: ['present', 'absent', 'halfDay', 'leave'] }).notNull(),
}, (table) => ({
  staffIdIdx: index('idx_attendance_staff_staff_id').on(table.staffId),
}));

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  month: smallint('month').notNull(),
  year: smallint('year').notNull(),
  status: text('status', { enum: ['draft', 'approved', 'paid'] }).notNull().default('draft'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
});

export const payrollEntries = pgTable('payroll_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  staffId: uuid('staff_id').notNull().references(() => staff.id),
  baseRate: numeric('base_rate', { precision: 10, scale: 2 }).notNull(),
  sessionsCounted: smallint('sessions_counted'),
  daysPresent: smallint('days_present'),
  grossPay: numeric('gross_pay', { precision: 10, scale: 2 }).notNull(),
  netPay: numeric('net_pay', { precision: 10, scale: 2 }).notNull(),
}, (table) => ({
  runIdIdx: index('idx_payroll_entries_run_id').on(table.payrollRunId),
  staffIdIdx: index('idx_payroll_entries_staff_id').on(table.staffId),
}));

export const payrollAdjustments = pgTable('payroll_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollEntryId: uuid('payroll_entry_id').notNull().references(() => payrollEntries.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
});

export const ledgerAccounts = pgTable('ledger_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['asset', 'liability', 'equity', 'income', 'expense'] }).notNull(),
});

export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryDate: timestamp('entry_date', { mode: 'date' }).notNull(),
  description: text('description'),
  sourceType: text('source_type', { enum: ['feePayment', 'payroll', 'expense', 'smsCost', 'manual', 'foodPurchase', 'foodContribution'] }).notNull(),
  sourceId: uuid('source_id'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const ledgerLines = pgTable('ledger_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  ledgerEntryId: uuid('ledger_entry_id').notNull().references(() => ledgerEntries.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => ledgerAccounts.id),
    debit: numeric('debit', { precision: 10, scale: 2 }).notNull().default('0'),
    credit: numeric('credit', { precision: 10, scale: 2 }).notNull().default('0'),
}, (table) => ({
  entryIdIdx: index('idx_ledger_lines_entry_id').on(table.ledgerEntryId),
  accountIdIdx: index('idx_ledger_lines_account_id').on(table.accountId),
}));

export const attendanceStudent = pgTable('attendance_student', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  date: timestamp('date', { mode: 'date' }).notNull(),
  status: text('status', { enum: ['present', 'absent', 'late', 'excused'] }).notNull(),
  markedBy: uuid('marked_by').references(() => users.id),
}, (table) => ({
  studentIdIdx: index('idx_attendance_student_student_id').on(table.studentId),
}));

export const leaveNotes = pgTable('leave_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  leaveDate: timestamp('leave_date', { mode: 'date' }).notNull(),
  expectedReturnDate: timestamp('expected_return_date', { mode: 'date' }).notNull(),
  actualReturnDate: timestamp('actual_return_date', { mode: 'date' }),
  status: text('status', { enum: ['approved', 'pending', 'rejected'] }).default('pending'),
  notedBy: uuid('noted_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  printedAt: timestamp('printed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});


export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['schoolAdmin', 'teacher', 'accountant', 'parent'] }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type', { enum: ['info', 'warning', 'success', 'error', 'payroll'] }).notNull().default('info'),
  isRead: boolean('is_read').default(false),
  link: text('link'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const teacherPreferences = pgTable('teacher_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }).unique(),
  preferredGrade: text('preferred_grade'),
  preferredClass: text('preferred_class'),
  preferredLearningAreaId: uuid('preferred_learning_area_id').references(() => learningAreas.id),
  priority: smallint('priority').default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sessionAssignments = pgTable('session_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  sessionType: text('session_type', { enum: ['morning', 'evening', 'weekend'] }).notNull(),
  dayOfWeek: smallint('day_of_week').notNull(),
  isActive: boolean('is_active').default(true),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
  assignedBy: uuid('assigned_by').references(() => users.id),
}, (table) => ({
  uqStaffDay: unique('uq_session_assignment_staff_day').on(table.staffId, table.dayOfWeek),
}));

export const exitNotifications = pgTable('exit_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  exitDate: timestamp('exit_date', { mode: 'date' }).notNull(),
  status: text('status', { enum: ['pending', 'actioned', 'dismissed'] }).notNull().default('pending'),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow(),
  actionedAt: timestamp('actioned_at', { withTimezone: true }),
  actionedBy: uuid('actioned_by').references(() => users.id),
  actionType: text('action_type', { enum: ['reassign', 'shuffle', 'dismiss'] }),
  affectedSlotIds: text('affected_slot_ids').array().default([]),
});

export const extraDutyPayments = pgTable('extra_duty_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  sessionType: text('session_type', { enum: ['morning', 'evening', 'weekend'] }).notNull(),
  date: timestamp('date', { mode: 'date' }).notNull(),
  rate: numeric('rate', { precision: 10, scale: 2 }).notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status', { enum: ['pending', 'approved', 'paid'] }).notNull().default('pending'),
  payrollRunId: uuid('payroll_run_id').references(() => payrollRuns.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const smsTemplates = pgTable('sms_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type', { enum: ['feeReminder', 'receipt', 'results', 'meeting', 'attendance', 'emergency', 'custom'] }).notNull(),
  content: text('content').notNull(),
  variables: text('variables').array().default([]),
  language: text('language', { enum: ['sw', 'en'] }).default('en'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
});

export const smsCampaigns = pgTable('sms_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type', { enum: ['bulk', 'scheduled', 'automated'] }).notNull(),
  targetFilter: jsonb('target_filter').notNull(),
  templateId: uuid('template_id').references(() => smsTemplates.id),
  message: text('message'),
  recipientCount: smallint('recipient_count'),
  status: text('status', { enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'partiallyFailed'] }).notNull().default('draft'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentBy: uuid('sent_by').references(() => users.id),
  cost: numeric('cost', { precision: 10, scale: 2 }),
});

export const smsLogs = pgTable('sms_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => smsCampaigns.id),
  recipientId: uuid('recipient_id'),
  recipientType: text('recipient_type', { enum: ['guardian', 'teacher', 'staff'] }).notNull(),
  phoneNumber: text('phone_number').notNull(),
  message: text('message').notNull(),
  templateId: uuid('template_id').references(() => smsTemplates.id),
  providerMessageId: text('provider_message_id'),
  status: text('status', { enum: ['queued', 'sent', 'delivered', 'failed'] }).notNull().default('queued'),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  cost: numeric('cost', { precision: 10, scale: 2 }),
});

export const automatedSmsRules = pgTable('automated_sms_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  triggerType: text('trigger_type', { enum: ['feeDueSoon', 'feeOverdue', 'lowAttendance', 'resultPublished', 'emergencyClosure', 'custom'] }).notNull(),
  conditions: jsonb('conditions').notNull(),
  templateId: uuid('template_id').references(() => smsTemplates.id),
  isActive: boolean('is_active').default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
});

export const curriculumConfigs = pgTable('curriculum_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  gradeBand: text('grade_band', { enum: ['PP', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JSS'] }).notNull(),
  effectiveFrom: timestamp('effective_from', { mode: 'date' }).notNull(),
  lessonDurationMinutes: smallint('lesson_duration_minutes').notNull(),
  breakSchedule: jsonb('break_schedule').$type<Array<{ name: string; startTime: string; durationMinutes: number }>>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const curriculumSubjects = pgTable('curriculum_subjects', {
  id: uuid('id').primaryKey().defaultRandom(),
  curriculumConfigId: uuid('curriculum_config_id').notNull().references(() => curriculumConfigs.id, { onDelete: 'cascade' }),
  learningAreaId: uuid('learning_area_id').references(() => learningAreas.id),
  name: text('name').notNull(),
  weeklyLessons: smallint('weekly_lessons').notNull(),
  allowsDoubleLesson: boolean('allows_double_lesson').notNull().default(false),
  isChoiceGroup: boolean('is_choice_group').notNull().default(false),
  requiresRoomType: text('requires_room_type'),
  sortOrder: smallint('sort_order').notNull().default(0),
});

export const choiceGroupOptions = pgTable('choice_group_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  curriculumSubjectId: uuid('curriculum_subject_id').notNull().references(() => curriculumSubjects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  studentCount: integer('student_count').notNull().default(0),
});

export const usersRelations = relations(users, ({ many }) => ({
  assessments: many(assessments),
  reportCards: many(reportCards),
  payrollRunsApproved: many(payrollRuns, { relationName: 'approvedBy' }),
  receiptsIssued: many(receipts),
  ledgerEntries: many(ledgerEntries),
  smsCampaignsSent: many(smsCampaigns),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  guardians: many(guardians),
  assessments: many(assessments),
  reportCards: many(reportCards),
  invoices: many(feeInvoices),
  attendanceRecords: many(attendanceStudent),
  leaveNotes: many(leaveNotes),
  mpesaTransactionsMatched: many(mpesaTransactions, { relationName: 'matchedStudent' }),
  attendance: many(attendanceStudent),
}));

export const guardiansRelations = relations(guardians, ({ one }) => ({
  student: one(students, {
    fields: [guardians.studentId],
    references: [students.id],
  }),
}));

export const parentStudentLinks = pgTable('parent_student_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  guardianId: uuid('guardian_id').references(() => guardians.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniq: unique().on(table.userId, table.studentId),
}));

export const parentStudentLinksRelations = relations(parentStudentLinks, ({ one }) => ({
  user: one(users, { fields: [parentStudentLinks.userId], references: [users.id] }),
  student: one(students, { fields: [parentStudentLinks.studentId], references: [students.id] }),
  guardian: one(guardians, { fields: [parentStudentLinks.guardianId], references: [guardians.id] }),
}));

export const learningAreasRelations = relations(learningAreas, ({ many }) => ({
  strands: many(strands),
  assessments: many(assessments),
}));

export const strandsRelations = relations(strands, ({ one, many }) => ({
  learningArea: one(learningAreas, {
    fields: [strands.learningAreaId],
    references: [learningAreas.id],
  }),
  assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  student: one(students, {
    fields: [assessments.studentId],
    references: [students.id],
  }),
  learningArea: one(learningAreas, {
    fields: [assessments.learningAreaId],
    references: [learningAreas.id],
  }),
  strand: one(strands, {
    fields: [assessments.strandId],
    references: [strands.id],
  }),
  assessedByUser: one(users, {
    fields: [assessments.assessedBy],
    references: [users.id],
  }),
}));

export const reportCardsRelations = relations(reportCards, ({ one }) => ({
  student: one(students, {
    fields: [reportCards.studentId],
    references: [students.id],
  }),
  generatedByUser: one(users, {
    fields: [reportCards.generatedBy],
    references: [users.id],
  }),
}));

export const feeStructuresRelations = relations(feeStructures, ({ many }) => ({
  invoices: many(feeInvoices),
}));

export const feeInvoicesRelations = relations(feeInvoices, ({ one, many }) => ({
  student: one(students, {
    fields: [feeInvoices.studentId],
    references: [students.id],
  }),
  feeStructure: one(feeStructures, {
    fields: [feeInvoices.feeStructureId],
    references: [feeStructures.id],
  }),
  receipts: many(receipts),
  mpesaTransactionsMatched: many(mpesaTransactions, { relationName: 'matchedInvoice' }),
}));

export const paybillsRelations = relations(paybills, ({ many }) => ({
  mpesaTransactions: many(mpesaTransactions),
}));

export const mpesaTransactionsRelations = relations(mpesaTransactions, ({ one }) => ({
  paybill: one(paybills, {
    fields: [mpesaTransactions.paybillId],
    references: [paybills.id],
  }),
  matchedStudent: one(students, {
    fields: [mpesaTransactions.matchedStudentId],
    references: [students.id],
  }),
  matchedInvoice: one(feeInvoices, {
    fields: [mpesaTransactions.matchedInvoiceId],
    references: [feeInvoices.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  invoice: one(feeInvoices, {
    fields: [receipts.invoiceId],
    references: [feeInvoices.id],
  }),
  mpesaTransaction: one(mpesaTransactions, {
    fields: [receipts.mpesaTransactionId],
    references: [mpesaTransactions.id],
  }),
  issuedByUser: one(users, {
    fields: [receipts.issuedBy],
    references: [users.id],
  }),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  attendance: many(attendanceStaff),
  payrollEntries: many(payrollEntries),
}));

export const attendanceStaffRelations = relations(attendanceStaff, ({ one }) => ({
  staff: one(staff, {
    fields: [attendanceStaff.staffId],
    references: [staff.id],
  }),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  approvedByUser: one(users, {
    fields: [payrollRuns.approvedBy],
    references: [users.id],
  }),
  entries: many(payrollEntries),
}));

export const payrollEntriesRelations = relations(payrollEntries, ({ one, many }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payrollEntries.payrollRunId],
    references: [payrollRuns.id],
  }),
  staff: one(staff, {
    fields: [payrollEntries.staffId],
    references: [staff.id],
  }),
  adjustments: many(payrollAdjustments),
}));

export const payrollAdjustmentsRelations = relations(payrollAdjustments, ({ one }) => ({
  payrollEntry: one(payrollEntries, {
    fields: [payrollAdjustments.payrollEntryId],
    references: [payrollEntries.id],
  }),
}));

export const ledgerAccountsRelations = relations(ledgerAccounts, ({ many }) => ({
  lines: many(ledgerLines),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [ledgerEntries.createdBy],
    references: [users.id],
  }),
  lines: many(ledgerLines),
}));

export const ledgerLinesRelations = relations(ledgerLines, ({ one }) => ({
  ledgerEntry: one(ledgerEntries, {
    fields: [ledgerLines.ledgerEntryId],
    references: [ledgerEntries.id],
  }),
  account: one(ledgerAccounts, {
    fields: [ledgerLines.accountId],
    references: [ledgerAccounts.id],
  }),
}));

export const attendanceStudentRelations = relations(attendanceStudent, ({ one }) => ({
  student: one(students, {
    fields: [attendanceStudent.studentId],
    references: [students.id],
  }),
  markedByUser: one(users, {
    fields: [attendanceStudent.markedBy],
    references: [users.id],
  }),
}));

export const smsTemplatesRelations = relations(smsTemplates, ({ many }) => ({
  campaigns: many(smsCampaigns),
  logs: many(smsLogs),
  automatedRules: many(automatedSmsRules),
}));

export const smsCampaignsRelations = relations(smsCampaigns, ({ one, many }) => ({
  template: one(smsTemplates, {
    fields: [smsCampaigns.templateId],
    references: [smsTemplates.id],
  }),
  sentByUser: one(users, {
    fields: [smsCampaigns.sentBy],
    references: [users.id],
  }),
  logs: many(smsLogs),
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  campaign: one(smsCampaigns, {
    fields: [smsLogs.campaignId],
    references: [smsCampaigns.id],
  }),
  template: one(smsTemplates, {
    fields: [smsLogs.templateId],
    references: [smsTemplates.id],
  }),
}));

export const automatedSmsRulesRelations = relations(automatedSmsRules, ({ one }) => ({
  template: one(smsTemplates, {
    fields: [automatedSmsRules.templateId],
    references: [smsTemplates.id],
  }),
}));

export const schoolSettings = pgTable('school_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolName: text('school_name').notNull().default('My School'),
  schoolMotto: text('school_motto').default(''),
  schoolAddress: text('school_address').default(''),
  schoolPhone: text('school_phone').default(''),
  schoolEmail: text('school_email').default(''),
  logoUrl: text('logo_url').default(''),
  currentTerm: text('current_term').default('Term 1'),
  currentAcademicYear: text('current_academic_year').default('2026'),
  termStartDate: timestamp('term_start_date', { mode: 'date' }),
  termEndDate: timestamp('term_end_date', { mode: 'date' }),
  nextTermStartDate: timestamp('next_term_start_date', { mode: 'date' }),
  gradingSystem: text('grading_system').default('CBC'),
  currency: text('currency').default('KES'),
  timezone: text('timezone').default('Africa/Nairobi'),
  smsSenderId: text('sms_sender_id').default('School'),
  morningSessionRate: numeric('morning_session_rate', { precision: 10, scale: 2 }).default('200'),
  eveningSessionRate: numeric('evening_session_rate', { precision: 10, scale: 2 }).default('300'),
  weekendSessionRate: numeric('weekend_session_rate', { precision: 10, scale: 2 }).default('500'),
  classTeacherSignature: text('class_teacher_signature'),
  headTeacherSignature: text('head_teacher_signature'),
  payDay: smallint('pay_day').default(5),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const classTeachers = pgTable('class_teachers', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffId: uuid('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  grade: text('grade').notNull(),
  class: text('class'),
  signatureUrl: text('signature_url'),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  unq: unique('uq_class_teacher_grade').on(table.grade, table.class),
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  category: text('category', {
    enum: ['leave_note', 'invoice', 'payment', 'student', 'user', 'setting', 'attendance', 'report_card', 'fee_structure', 'other'],
  }).notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  description: text('description').notNull(),
  performedBy: uuid('performed_by').references(() => users.id),
  performedByName: text('performed_by_name'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
