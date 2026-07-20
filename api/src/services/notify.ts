import { db } from '../db';
import { notifications, users } from '../models/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

type NotificationType = 'info' | 'warning' | 'success' | 'error' | 'payroll';
type Role = 'schoolAdmin' | 'teacher' | 'accountant' | 'parent';

interface NotifyOptions {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  roles?: Role[];
  userIds?: string[];
}

async function notify(options: NotifyOptions) {
  const { title, message, type, link, roles = ['schoolAdmin'], userIds } = options;

  let targets: { id: string; role: Role }[] = [];

  if (userIds && userIds.length > 0) {
    targets = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(sql`${users.id} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}])`);
  } else if (roles.length > 0) {
    targets = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(sql`${users.role} = ANY(ARRAY[${sql.join(roles.map(r => sql`${r}`), sql`, `)}])`);
  }

  if (targets.length === 0) return;

  for (const target of targets) {
    await db.insert(notifications).values({
      userId: target.id,
      role: target.role,
      title,
      message,
      type,
      link: link || null,
    });
  }

  logger.info(`Notification created: "${title}" for ${targets.length} user(s) (${roles.join(', ')})`);
}

export { notify, type NotificationType, type Role };
