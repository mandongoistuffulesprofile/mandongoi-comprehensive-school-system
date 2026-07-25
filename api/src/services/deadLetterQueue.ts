import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

type DlqEntry = {
  sourceType: string;
  sourceId?: string;
  payload: unknown;
  errorMessage: string;
};

export async function writeToDlq(entry: DlqEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO dead_letter_queue (source_type, source_id, payload, error_message)
      VALUES (${entry.sourceType}, ${entry.sourceId ?? null}, ${JSON.stringify(entry.payload)}::jsonb, ${entry.errorMessage})
    `);
    logger.warn('Dead letter queue entry written', { sourceType: entry.sourceType, sourceId: entry.sourceId });
  } catch (err) {
    logger.error('Failed to write to dead letter queue', { error: err });
  }
}
