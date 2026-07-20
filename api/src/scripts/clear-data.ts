import 'dotenv/config';
import { config } from '../config';
import { validateConfig } from '../config';
import { db } from '../db';
import {
  users,
  staff,
  students,
  guardians,
  learningAreas,
  strands,
  assessments,
  reportCards,
  feeStructures,
  feeInvoices,
  receipts,
  mpesaTransactions,
  paybills,
  ledgerAccounts,
  ledgerEntries,
  ledgerLines,
  smsTemplates,
  smsCampaigns,
  smsLogs,
  automatedSmsRules,
  parentStudentLinks,
  attendanceStudent,
  attendanceStaff,
  payrollRuns,
  payrollEntries,
  payrollAdjustments,
  schoolSettings,
  leaveNotes,
} from '../models/schema';

validateConfig();

async function main() {
  const tables = [
    payrollAdjustments,
    payrollEntries,
    payrollRuns,
    attendanceStaff,
    attendanceStudent,
    smsLogs,
    smsCampaigns,
    automatedSmsRules,
    smsTemplates,
    parentStudentLinks,
    reportCards,
    assessments,
    strands,
    learningAreas,
    receipts,
    mpesaTransactions,
    ledgerLines,
    ledgerEntries,
    ledgerAccounts,
    feeInvoices,
    feeStructures,
    guardians,
    students,
    paybills,
    staff,
    leaveNotes,
    users,
  ];

  const tableNames = [
    'payroll_adjustments', 'payroll_entries', 'payroll_runs',
    'attendance_staff', 'attendance_student',
    'sms_logs', 'sms_campaigns', 'automated_sms_rules', 'sms_templates',
    'parent_student_links', 'report_cards', 'assessments',
    'strands', 'learning_areas', 'receipts', 'mpesa_transactions',
    'ledger_lines', 'ledger_entries', 'ledger_accounts',
    'fee_invoices', 'fee_structures', 'guardians', 'students',
    'paybills', 'staff', 'leave_notes', 'users',
  ];

  for (let i = 0; i < tables.length; i++) {
    await db.delete(tables[i]);
    console.log(`Cleared ${tableNames[i]}`);
  }

  console.log('All data cleared successfully');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Clear data failed:', err);
    process.exit(1);
  });
