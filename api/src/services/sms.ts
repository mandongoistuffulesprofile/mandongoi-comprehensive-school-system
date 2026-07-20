import { db } from '../db';
import { smsLogs, guardians } from '../models/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createSmsProvider } from './sms-provider';
import { logger } from '../utils/logger';

const provider = createSmsProvider();

export type SmsRecipientType = 'guardian' | 'teacher' | 'staff';

export type SmsRecipient = {
  recipientId?: string;
  recipientType: SmsRecipientType;
  phoneNumber: string;
  message: string;
  templateId?: string;
  campaignId?: string;
};

export async function sendSmsMessages(recipients: SmsRecipient[]) {
  const logs = [];

  const phones = recipients.map(r => r.phoneNumber).filter(Boolean);
  const optOuts = phones.length > 0
    ? await db.select({ phone: guardians.phone }).from(guardians).where(and(inArray(guardians.phone, phones), eq(guardians.smsOptOut, true)))
    : [];
  const optOutPhones = new Set(optOuts.map(o => o.phone));

  for (const recipient of recipients) {
    const base = {
      campaignId: recipient.campaignId || null,
      recipientId: recipient.recipientId || null,
      recipientType: recipient.recipientType,
      phoneNumber: recipient.phoneNumber,
      message: recipient.message,
      templateId: recipient.templateId || null,
    };

    if (recipient.recipientType === 'guardian' && optOutPhones.has(recipient.phoneNumber)) {
      const [log] = await db
        .insert(smsLogs)
        .values({
          ...base,
          status: 'failed',
          errorMessage: 'Recipient has opted out of SMS',
          sentAt: new Date(),
        })
        .returning();
      logs.push(log);
      continue;
    }

    const [log] = await db
      .insert(smsLogs)
      .values({ ...base, status: 'queued' })
      .returning();

    const result = await provider.send(recipient.phoneNumber, recipient.message);

    const [updated] = await db
      .update(smsLogs)
      .set({
        status: result.success ? 'sent' : 'failed',
        providerMessageId: result.providerMessageId || null,
        errorMessage: result.errorMessage || null,
        cost: result.cost != null ? String(result.cost) : null,
        sentAt: result.success ? new Date() : null,
      })
      .where(eq(smsLogs.id, log.id))
      .returning();

    logs.push(updated);
  }

  return logs;
}
