import { Pool } from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_p2Asehxz8PGf@ep-crimson-art-atmxa43t-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 10000,
  ...(connectionString.includes('sslmode=') ? {} : { ssl: { rejectUnauthorized: false } }),
});

pool.query('SELECT 1').then(r => {
  console.log('OK', JSON.stringify(r.rows));
  process.exit(0);
}).catch(e => {
  console.log('ERROR:', e.message, e.code, e.cause);
  process.exit(1);
});
