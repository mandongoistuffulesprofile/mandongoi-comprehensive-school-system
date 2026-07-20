import 'dotenv/config';
import { config } from '../config';
import { Pool } from 'pg';

async function main() {
  const raw = config.database.url;
  const url = new URL(raw);
  const endpointId = url.hostname.split('.')[0];
  url.hostname = '3.220.135.142';
  url.searchParams.set('options', 'endpoint=' + endpointId);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');
  const pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false, servername: url.hostname }, max: 1, connectionTimeoutMillis: 10000 });
  const c = await pool.connect();
  const r = await c.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position");
  for (const row of r.rows) {
    console.log(`${row.column_name}  ${row.data_type}  nullable=${row.is_nullable}`);
  }
  c.release();
  await pool.end();
}
main().catch(console.error);
