import 'dotenv/config';
import { config, validateConfig } from '../config';
validateConfig();
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

async function main() {
  const raw = config.database.url;
  const url = new URL(raw);
  const originalHost = url.hostname;
  const endpointId = originalHost.split('.')[0];
  url.hostname = '3.220.135.142';
  url.searchParams.set('options', 'endpoint=' + endpointId);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');

  const pool = new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false, servername: originalHost },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  const client = await pool.connect();
  try {
    const files = fs.readdirSync(path.join(process.cwd(), 'drizzle'))
      .filter((fn: string) => /^000[5-9]/.test(fn)).sort();
    for (const fn of files) {
      const sql = fs.readFileSync(path.join(process.cwd(), 'drizzle', fn), 'utf-8');
      const statements = sql.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean);
      console.log(`Applying ${fn} (${statements.length} statements)...`);
      for (const stmt of statements) {
        try {
          await client.query(stmt);
          console.log(`  OK`);
        } catch (e: any) {
          if (e.message?.includes('already exists')) {
            console.log(`  Skipped (already exists)`);
          } else {
            throw e;
          }
        }
      }
    }
    console.log('Late migrations done');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
