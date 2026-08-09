// Mirrors src/models/schema.ts in the backend. Money fields are always strings.

export type Role = "schoolAdmin" | "teacher" | "accountant" | "parent";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  permissions?: string[];
  isActive?: boolean;
  mustResetPassword?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationInfo;
  error?: string;
}

export type StudentStatus = "active" | "transferred" | "graduated" | "withdrawn";

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  level: "pre_primary" | "comprehensive";
  grade: string;
  class?: string;
  enrollmentDate: string;
  nemisId?: string;
  studentType?: "boarding" | "day";
  boardingHouse?: string;
  foodProgramType?: "bring_own" | "pay_fee" | "none";
  status: StudentStatus;
  photoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const LEVELS = [
  { value: "pre_primary", label: "PPP (Pre-Primary)", grades: ["PP1", "PP2"] },
  { value: "comprehensive", label: "Comprehensive School", grades: ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"] },
] as const;

export type Language = "sw" | "en";

export interface Guardian {
  id: string;
  studentId: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
  preferredLanguage: Language;
  smsOptOut: boolean;
  createdAt?: string;
}

export interface LearningArea {
  id: string;
  name: string;
  gradeLevels: string[];
}

export interface Strand {
  id: string;
  learningAreaId: string;
  name: string;
}

export type AssessmentType = "formative" | "summative";

export interface Assessment {
  id: string;
  studentId: string;
  learningAreaId: string;
  strandId: string;
  term: number;
  academicYear: number;
  type: AssessmentType;
  performanceLevel: number;
  score?: string;
  remarks?: string;
  assessedBy?: string;
  assessedAt?: string;
}

export interface ReportCard {
  id: string;
  studentId: string;
  term: number;
  academicYear: number;
  compiledResults: unknown;
  teacherComments?: string;
  headTeacherComments?: string;
  generatedAt?: string;
  generatedBy?: string;
  publishedAt?: string | null;
}

export interface FeeStructure {
  id: string;
  grade: string;
  term: number;
  academicYear: number;
  status: "draft" | "active";
  studentType: "boarding" | "day" | "both";
  tuitionAmount: string;
  activityAmount: string;
  adminLevyAmount: string;
  boardingAmount: string;
  foodAmount: string;
  totalAmount: string;
}

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "overdue";

export interface FeeInvoice {
  id: string;
  studentId: string;
  feeStructureId: string;
  term: number;
  academicYear: number;
  totalAmount: string;
  amountPaid: string;
  balance: string;
  dueDate?: string;
  status: InvoiceStatus;
  lastReminderDate?: string;
  createdAt?: string;
  student?: Pick<Student, "id" | "firstName" | "lastName" | "grade">;
}

export type PaymentMethod = "mpesa" | "cash" | "bank";

export interface Receipt {
  id: string;
  invoiceId: string;
  mpesaTransactionId?: string;
  receiptNumber: string;
  amount: string;
  paymentMethod: PaymentMethod;
  issuedAt: string;
  issuedBy?: string;
}

export type StaffRole = "teacher" | "support";
export type EmploymentType = "flatRate" | "sessionBased";

export interface Staff {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: StaffRole;
  teacherType: "bom" | "tsc";
  employmentType: EmploymentType;
  baseRate: string;
  extraSessionRate?: string;
  subjects?: string[];
  payoutRef?: string;
  isActive: boolean;
}

export type StaffAttendanceStatus = "present" | "absent" | "halfDay" | "leave";

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  sessionsTaught: number;
  status: StaffAttendanceStatus;
}

export type PayrollRunStatus = "draft" | "approved" | "paid";

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface PayrollEntry {
  id: string;
  payrollRunId: string;
  staffId: string;
  baseRate: string;
  sessionsCounted?: number;
  daysPresent?: number;
  grossPay: string;
  netPay: string;
  staff?: Pick<Staff, "id" | "name">;
}

export interface PayrollAdjustment {
  id: string;
  payrollEntryId: string;
  reason: string;
  amount: string;
}

export type LedgerAccountType = "asset" | "liability" | "equity" | "income" | "expense";

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: LedgerAccountType;
}

export interface LedgerLine {
  id?: string;
  accountId: string;
  debit: string;
  credit: string;
}

export interface LedgerEntry {
  id: string;
  entryDate: string;
  description: string;
  sourceType: "feePayment" | "payroll" | "expense" | "smsCost" | "manual";
  sourceId?: string;
  lines?: LedgerLine[];
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: LedgerAccountType;
  debit: string;
  credit: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface StudentAttendance {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  markedBy?: string;
}

export interface SessionAssignment {
  id: string;
  staffId: string;
  sessionType: "morning" | "evening" | "weekend";
  dayOfWeek: number;
  isActive: boolean;
  staffName?: string;
}

export type SmsTemplateType =
  | "feeReminder"
  | "receipt"
  | "results"
  | "meeting"
  | "attendance"
  | "emergency"
  | "custom";

export interface SmsTemplate {
  id: string;
  name: string;
  type: SmsTemplateType;
  content: string;
  variables?: string[];
  language: Language;
  isDefault?: boolean;
  isActive: boolean;
}

export type SmsCampaignType = "bulk" | "scheduled" | "automated";
export type SmsCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "partiallyFailed";

export interface SmsCampaign {
  id: string;
  name: string;
  type: SmsCampaignType;
  targetFilter?: unknown;
  templateId?: string;
  message: string;
  recipientCount?: number;
  status: SmsCampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  sentBy?: string;
  cost?: string | number;
}

export type SmsLogStatus = "queued" | "sent" | "delivered" | "failed";

export interface SmsLog {
  id: string;
  campaignId?: string;
  recipientId: string;
  recipientType: "guardian" | "teacher" | "staff";
  phoneNumber: string;
  message: string;
  templateId?: string;
  providerMessageId?: string;
  status: SmsLogStatus;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  cost?: string;
}

export type SmsTriggerType =
  | "feeDueSoon"
  | "feeOverdue"
  | "lowAttendance"
  | "resultPublished"
  | "emergencyClosure"
  | "custom";

export interface AutomatedSmsRule {
  id: string;
  name: string;
  triggerType: SmsTriggerType;
  conditions?: unknown;
  templateId?: string;
  isActive: boolean;
  lastRunAt?: string;
}

export interface SchoolSettings {
  id: string;
  schoolName: string;
  schoolMotto: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  logoUrl: string;
  currentTerm: string;
  currentAcademicYear: string;
  termStartDate?: string;
  termEndDate?: string;
  nextTermStartDate?: string;
  gradingSystem: string;
  currency: string;
  timezone: string;
  smsSenderId: string;
  morningSessionRate?: string;
  eveningSessionRate?: string;
  weekendSessionRate?: string;
  classTeacherSignature?: string;
  headTeacherSignature?: string;
  payDay?: number;
  collectiveFoodCost?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  role: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error" | "payroll";
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  type: "mpesa" | "manual";
  transactionId: string;
  amount: string;
  phoneNumber: string;
  accountReference: string;
  matchStatus: string;
  transactionDate: string;
  createdAt: string;
}

export interface GuardianRecipient {
  id: string;
  name: string;
  phone: string;
  studentName: string;
  grade: string;
  studentId?: string;
  balance?: string;
}

export interface Paybill {
  id: string;
  name: string;
  shortcode: string;
  accountReferenceFormat: string;
  purpose: "tuition" | "trip" | "event" | "custom";
  darajaConsumerKeyRef: string;
  darajaConsumerSecretRef: string;
  darajaPasskeyRef: string;
  isActive: boolean;
}

// Not yet implemented on the backend — see api/parentLinks.ts for the isolated stub.
export interface ParentStudentLink {
  id: string;
  userId: string;
  studentId: string;
  userEmail?: string;
  userName?: string;
  studentName?: string;
  studentGrade?: string;
  createdAt?: string;
}
