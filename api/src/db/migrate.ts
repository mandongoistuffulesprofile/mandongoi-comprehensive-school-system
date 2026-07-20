import 'dotenv/config';
import { config } from '../config';
import { validateConfig } from '../config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import { promisify } from 'util';

validateConfig();

const lookup = promisify(dns.lookup);

const TRACKING_TABLE = '_migrations';

async function ensureTrackingTable(client: any) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${TRACKING_TABLE}" (
      name text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )
  `);
}

async function getApplied(client: any): Promise<Set<string>> {
  const result = await client.query(`SELECT name FROM "${TRACKING_TABLE}"`);
  return new Set(result.rows.map((r: any) => r.name));
}

async function createPool() {
  const raw = config.database.url;
  const url = new URL(raw);
  const originalHost = url.hostname;
  const isProduction = config.env === 'production';
  let connectionString = raw;

  const isNeon = originalHost.includes('neon.tech');
  if (!isProduction && isNeon) {
    const endpointId = originalHost.split('.')[0];
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    url.searchParams.set('options', `endpoint=${endpointId}`);

    let resolvedHost = originalHost;
    if (originalHost && !originalHost.includes(':')) {
      try {
        const addr = await lookup(originalHost, { family: 4 });
        resolvedHost = addr.address;
      } catch (err) {
        console.warn(`DNS lookup failed for ${originalHost}, using hostname directly`);
      }
    }
    url.hostname = resolvedHost;
    connectionString = url.toString();
  }

  return new Pool({
    connectionString,
    ssl: !isNeon ? false : { rejectUnauthorized: false, servername: isProduction ? undefined : originalHost },
    max: 1,
    connectionTimeoutMillis: 10000,
  });
}

async function runMigrations() {
  const pool = await createPool();
  const client = await pool.connect();

  await ensureTrackingTable(client);
  const applied = await getApplied(client);

  const migrationsDir = path.join(process.cwd(), 'drizzle');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log('All migrations already applied');
    client.release();
    await pool.end();
    return;
  }

  console.log(`Applying ${pending.length} pending migration(s)...`);

  for (const file of pending) {
    const fullPath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(fullPath, 'utf-8');
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`  Applying ${file} (${statements.length} statements)...`);

    for (const statement of statements) {
      await client.query(statement);
    }

    await client.query(`INSERT INTO "${TRACKING_TABLE}" (name) VALUES ($1)`, [file]);
    console.log(`  ✓ ${file} applied and tracked`);
  }

  console.log('Migrations completed successfully');
  client.release();
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
