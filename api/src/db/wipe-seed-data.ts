import 'dotenv/config';
import { config, validateConfig } from '../config';
import { pool } from '../db';

validateConfig();

const TABLES_TO_WIPE = [
  // Student-related (cascades from students.id)
  'parent_student_links',
  'guardians',
  'students',

  // Fee / invoice data (mock pricing)
  'fee_invoices',
  'fee_structures',

  // Attendance
  'attendance_student',
  'attendance_staff',

  // Academic assessments
  'assessments',
  'report_cards',

  // Ledger (transactions only, preserve chart of accounts)
  'ledger_lines',
  'ledger_entries',

  // M-Pesa payments
  'mpesa_transactions',
  'receipts',

  // Food program (clear logs/presets templates, preserve food_presets)
  'food_logs',
  'meal_templates',

  // Staff management (clear mock staff, preserve table schema)
  'class_teachers',
  'session_assignments',
  'teacher_preferences',
  'exit_notifications',
  'extra_duty_payments',
  'payroll_adjustments',
  'payroll_entries',
  'payroll_runs',
  'staff',

  // SMS (clear campaigns/logs/rules, preserve templates)
  'sms_campaigns',
  'sms_logs',
  'automated_sms_rules',

  // System
  'notifications',
  'audit_logs',
];

const TABLES_TO_PRESERVE = [
  // System config
  'school_settings',

  // User accounts (keep admin bootstrap)
  'users',

  // Reference data
  'ledger_accounts',
  'sms_templates',
  'paybills',
  'food_presets',

  // Curriculum
  'learning_areas',
  'strands',
  'curriculum_configs',
  'curriculum_subjects',
  'choice_group_options',
];

async function main() {
  console.log('=== School System Data Wipe ===\n');

  const client = await pool.connect();
  try {
    // Verify we're targeting the right database
    const dbNameResult = await client.query('SELECT current_database() as db');
    const dbName = dbNameResult.rows[0]?.db;
    console.log(`Database: ${dbName}`);
    console.log(`Environment: ${config.env}`);
    console.log(`\nPreserving ${TABLES_TO_PRESERVE.length} tables:`);
    TABLES_TO_PRESERVE.forEach((t) => console.log(`  ✓ ${t}`));
    console.log(`\nWiping ${TABLES_TO_WIPE.length} tables:`);
    TABLES_TO_WIPE.forEach((t) => console.log(`  ✗ ${t}`));

    // Confirm we're in development (safety check)
    if (config.env === 'production') {
      console.error('\n⛔ REFUSING to run on production environment');
      process.exit(1);
    }

    console.log('\nExecuting wipe...');

    await client.query('BEGIN');
    const truncateSql = `TRUNCATE ${TABLES_TO_WIPE.join(', ')} CASCADE`;
    await client.query(truncateSql);
    await client.query('COMMIT');

    console.log(`✅ Successfully wiped ${TABLES_TO_WIPE.length} tables.`);

    // Verify preserved tables still have data
    for (const table of TABLES_TO_PRESERVE) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0]?.count;
      console.log(`  Preserved ${table}: ${count} records`);
    }

    // Verify wiped tables are empty
    let allEmpty = true;
    for (const table of TABLES_TO_WIPE) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows[0]?.count;
      if (Number(count) > 0) {
        console.log(`  ⚠️  ${table} still has ${count} records (likely preserved by FK)`);
        allEmpty = false;
      }
    }
    if (allEmpty) {
      console.log(`✅ All ${TABLES_TO_WIPE.length} wiped tables are empty.`);
    }

    console.log('\n=== Wipe complete ===');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Wipe failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
