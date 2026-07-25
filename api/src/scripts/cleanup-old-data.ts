import 'dotenv/config';
import { config } from '../config';
import { validateConfig } from '../config';
import { Pool } from 'pg';

validateConfig();

const RETENTION_YEARS = 2;

async function cleanup() {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });

  try {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

    console.log(`Cleaning up records older than ${cutoff.toISOString().split('T')[0]}...`);

    const result = await pool.query(`
      DELETE FROM sms_logs WHERE created_at < $1
    `, [cutoff]);
    console.log(`  sms_logs: ${result.rowCount} rows deleted`);

    const auditResult = await pool.query(`
      DELETE FROM audit_logs WHERE created_at < $1
    `, [cutoff]);
    console.log(`  audit_logs: ${auditResult.rowCount} rows deleted`);

    const foodResult = await pool.query(`
      DELETE FROM food_logs WHERE logged_at < $1
    `, [cutoff]);
    console.log(`  food_logs: ${foodResult.rowCount} rows deleted`);

    const notifResult = await pool.query(`
      DELETE FROM notifications WHERE created_at < $1 AND is_read = true
    `, [cutoff]);
    console.log(`  notifications (read): ${notifResult.rowCount} rows deleted`);

    console.log('Cleanup completed successfully');
  } finally {
    await pool.end();
  }
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
