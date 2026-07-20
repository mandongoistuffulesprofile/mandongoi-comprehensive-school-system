import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_p2Asehxz8PGf@ep-crimson-art-atmxa43t-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require', {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 10,
});

sql`SELECT 1`.then(r => {
  console.log('OK', r);
  return sql.end();
}).then(() => process.exit(0))
.catch(e => {
  console.log('ERROR:', e.message);
  process.exit(1);
});
