import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from '../models/schema';

const url = new URL(config.database.url);
const originalHost = url.hostname;
const isProduction = config.env === 'production';

let connectionString = url.toString();
const isNeon = originalHost.includes('neon.tech');

if (!isProduction && isNeon) {
  const endpointId = originalHost.split('.')[0];
  url.hostname = '3.220.135.142';
  url.searchParams.set('options', `endpoint=${endpointId}`);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('ssl');
  connectionString = url.toString();
}

export const pool = new Pool({
  connectionString,
  ssl: !isNeon ? false : { rejectUnauthorized: false, servername: isProduction ? undefined : originalHost },
  max: isProduction ? 10 : 5,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

export type DB = NodePgDatabase<typeof schema>;
export type Tx = PgTransaction<any, typeof schema, any>;
export type DbClient = DB | Tx;
