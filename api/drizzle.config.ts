import { defineConfig } from 'drizzle-kit';
import { config } from './src/config';

export default defineConfig({
  schema: './src/models/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.database.url,
  },
  schemaFilter: ['*'],
  migrationsFolder: './drizzle',
  verbose: true,
  strict: true,
});
