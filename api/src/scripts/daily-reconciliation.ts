import 'dotenv/config';
import { config } from '../config';
import { validateConfig } from '../config';
import { Pool } from 'pg';

validateConfig();

async function reconcile() {
  const pool = new Pool({ connectionString: config.database.url, max: 1 });

  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CAST(r.amount AS numeric)), 0) AS receipts_total,
        COALESCE(SUM(CAST(l.debit AS numeric)), 0) AS ledger_debit_total
      FROM receipts r
      FULL JOIN ledger_entries e ON e.source_type = 'feePayment'
        AND e.source_id::text = r.invoice_id::text
        AND e.entry_date::date = r.issued_at::date
      FULL JOIN ledger_lines l ON l.ledger_entry_id = e.id
      WHERE r.issued_at::date = $1::date
    `, [today]);

    const row = result.rows[0];
    const receiptsTotal = parseFloat(row.receipts_total || '0');
    const ledgerTotal = parseFloat(row.ledger_debit_total || '0');
    const diff = Math.abs(receiptsTotal - ledgerTotal);

    console.log(`Reconciliation for ${today}:`);
    console.log(`  Receipts total: KES ${receiptsTotal.toFixed(2)}`);
    console.log(`  Ledger debit total: KES ${ledgerTotal.toFixed(2)}`);
    console.log(`  Difference: KES ${diff.toFixed(2)}`);

    if (diff > 0.01) {
      console.warn(`  ⚠️ MISMATCH detected! Difference of KES ${diff.toFixed(2)}`);
      process.exit(1);
    } else {
      console.log('  ✅ Balanced');
    }
  } finally {
    await pool.end();
  }
}

reconcile().catch((err) => {
  console.error('Reconciliation check failed:', err);
  process.exit(1);
});
