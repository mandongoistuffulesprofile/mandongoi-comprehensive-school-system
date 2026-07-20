import { config } from '../config';
import { logger } from '../utils/logger';
import { stripNonGSM7, isGSM7 } from '../utils/gsm7';
import { normalizeKenyanPhone, validateSenderId } from '../utils/phone';

export interface SmsProvider {
  send(phoneNumber: string, message: string, senderId?: string): Promise<SmsProviderResult>;
  sendBulk?(phoneNumbers: string[], message: string, senderId?: string): Promise<SmsProviderResult[]>;
}

export interface SmsProviderResult {
  success: boolean;
  providerMessageId?: string;
  errorMessage?: string;
  cost?: number;
}

class AfricaTalkingProvider implements SmsProvider {
  async send(phoneNumber: string, message: string, senderId?: string): Promise<SmsProviderResult> {
    const apiKey = config.sms.apiKey;
    const username = config.sms.senderId || 'sandbox';
    if (!apiKey) {
      return { success: false, errorMessage: 'SMS API key not configured' };
    }
    try {
      const res = await fetch(
        `https://api.africastalking.com/version1/messaging`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'ApiKey': apiKey,
            'Accept': 'application/json',
          },
          body: new URLSearchParams({
            username,
            to: phoneNumber,
            message,
            ...(senderId ? { from: senderId } : {}),
          }),
        },
      );
      const json = await res.json() as any;
      if (res.ok && json.SMSMessageData?.Recipients?.length > 0) {
        const recipient = json.SMSMessageData.Recipients[0];
        return {
          success: recipient.status === 'Success',
          providerMessageId: recipient.messageId,
          errorMessage: recipient.status !== 'Success' ? recipient.status : undefined,
          cost: recipient.cost,
        };
      }
      return { success: false, errorMessage: json.error || `HTTP ${res.status}` };
    } catch (err) {
      logger.error('SMS provider send failed', { error: err });
      return { success: false, errorMessage: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

class GenericHttpProvider implements SmsProvider {
  async send(phoneNumber: string, message: string, senderId?: string): Promise<SmsProviderResult> {
    const { apiKey, apiUrl } = config.sms;
    if (!apiUrl || !apiKey) {
      return { success: false, errorMessage: 'SMS provider not configured' };
    }
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ sender: senderId, to: phoneNumber, message }),
      });
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (res.ok) {
        return {
          success: true,
          providerMessageId: (json.id || json.messageId) as string | undefined,
          cost: json.cost as number | undefined,
        };
      }
      return { success: false, errorMessage: (json.message as string) || `HTTP ${res.status}` };
    } catch (err) {
      return { success: false, errorMessage: err instanceof Error ? err.message : 'delivery error' };
    }
  }
}

class AdvantaProvider implements SmsProvider {
  private readonly baseUrl = 'https://quicksms.advantasms.com/api/services/sendsms/';
  private readonly bulkUrl = 'https://quicksms.advantasms.com/api/services/sendbulk/';

  async send(phoneNumber: string, message: string, senderId?: string): Promise<SmsProviderResult> {
    try {
      const apikey = config.sms.apiKey;
      const partnerID = config.sms.partnerID;
      const shortcode = validateSenderId(senderId || config.sms.senderId || 'JuaCom');

      if (!apikey) {
        return { success: false, errorMessage: 'Advanta API key not configured' };
      }
      if (!partnerID) {
        return { success: false, errorMessage: 'Advanta partnerID not configured' };
      }

      const mobile = normalizeKenyanPhone(phoneNumber);

      const safeMessage = isGSM7(message) ? message : stripNonGSM7(message);

      const payload = {
        apikey,
        partnerID,
        shortcode,
        message: safeMessage,
        mobile,
      };

      logger.debug('Advanta SMS send', {
        shortcode,
        mobile,
        messageLength: safeMessage.length,
        isGSM7: isGSM7(safeMessage),
      });

      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return { success: false, errorMessage: `Advanta non-JSON response: ${text}` };
      }

      if (res.ok && (json.status === 'success' || json.status === 'ok' || json.ResponseCode === '000')) {
        return {
          success: true,
          providerMessageId: json.messageId || json.MessageId || String(json.id || ''),
          cost: json.cost ?? json.balance ?? undefined,
        };
      }

      return {
        success: false,
        errorMessage: json.error || json.message || json.ResponseDescription || `HTTP ${res.status}`,
      };
    } catch (err) {
      logger.error('Advanta SMS send failed', { error: err });
      return { success: false, errorMessage: err instanceof Error ? err.message : 'Advanta send error' };
    }
  }

  async sendBulk(phoneNumbers: string[], message: string, senderId?: string): Promise<SmsProviderResult[]> {
    try {
      const apikey = config.sms.apiKey;
      const partnerID = config.sms.partnerID;
      const shortcode = validateSenderId(senderId || config.sms.senderId || 'JuaCom');

      if (!apikey) {
        return phoneNumbers.map(() => ({ success: false, errorMessage: 'Advanta API key not configured' }));
      }
      if (!partnerID) {
        return phoneNumbers.map(() => ({ success: false, errorMessage: 'Advanta partnerID not configured' }));
      }

      const mobiles = phoneNumbers.map((p) => normalizeKenyanPhone(p));
      const safeMessage = isGSM7(message) ? message : stripNonGSM7(message);

      const payload = {
        apikey,
        partnerID,
        shortcode,
        message: safeMessage,
        mobiles: mobiles.join(','),
      };

      logger.debug('Advanta SMS bulk', {
        shortcode,
        recipientCount: mobiles.length,
        messageLength: safeMessage.length,
      });

      const res = await fetch(this.bulkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return mobiles.map(() => ({ success: false, errorMessage: `Advanta non-JSON response: ${text}` }));
      }

      if (res.ok) {
        const responseMessages = Array.isArray(json.messages)
          ? json.messages
          : json.Responses ?? [];

        if (responseMessages.length === mobiles.length) {
          return responseMessages.map((r: any) => ({
            success: r.status === 'success' || r.status === 'ok' || r.ResponseCode === '000',
            providerMessageId: r.messageId || r.MessageId || '',
            cost: r.cost ?? undefined,
            errorMessage: r.error || r.message || r.ResponseDescription,
          }));
        }

        if (json.status === 'success' || json.status === 'ok' || json.ResponseCode === '000') {
          return mobiles.map(() => ({
            success: true,
            providerMessageId: json.messageId || json.MessageId || '',
            cost: json.cost ?? undefined,
          }));
        }

        return mobiles.map(() => ({
          success: false,
          errorMessage: json.error || json.message || json.ResponseDescription || `HTTP ${res.status}`,
        }));
      }

      return mobiles.map(() => ({
        success: false,
        errorMessage: json.error || json.message || json.ResponseDescription || `HTTP ${res.status}`,
      }));
    } catch (err) {
      logger.error('Advanta SMS bulk send failed', { error: err });
      const errorMessage = err instanceof Error ? err.message : 'Advanta bulk send error';
      return phoneNumbers.map(() => ({ success: false, errorMessage }));
    }
  }
}

export function createSmsProvider(): SmsProvider {
  const providerUrl = config.sms.apiUrl || '';

  if (providerUrl.includes('africastalking')) {
    logger.info('SMS provider initialized: AfricaTalkingProvider');
    return new AfricaTalkingProvider();
  }

  if (providerUrl.includes('advantasms') || !providerUrl) {
    logger.info('SMS provider initialized: AdvantaProvider');
    return new AdvantaProvider();
  }

  logger.info('SMS provider initialized: GenericHttpProvider');
  return new GenericHttpProvider();
}
