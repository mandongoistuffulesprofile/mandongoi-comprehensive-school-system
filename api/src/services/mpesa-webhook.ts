import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { mpesaAuth } from './mpesa-auth';
import { BASE_URL } from '../utils/mpesa';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export function parseSafaricomPayload(body: any): {
  transactionId: string;
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDate: string;
} | null {
  // C2B Confirmation format
  if (body.TransID && body.TransAmount) {
    return {
      transactionId: body.TransID,
      amount: Number(body.TransAmount),
      phoneNumber: String(body.MSISDN || ''),
      accountReference: body.BillRefNumber || '',
      transactionDate: body.TransTime
        ? `${body.TransTime.slice(0, 4)}-${body.TransTime.slice(4, 6)}-${body.TransTime.slice(6, 8)}T${body.TransTime.slice(8, 10)}:${body.TransTime.slice(10, 12)}:${body.TransTime.slice(12, 14)}+03:00`
        : new Date().toISOString(),
    };
  }

  // STK Push Callback format
  if (body.Body?.stkCallback?.CallbackMetadata?.Item) {
    const cb = body.Body.stkCallback;
    const items = cb.CallbackMetadata.Item;
    const getItem = (name: string) => items.find((i: any) => i.Name === name)?.Value;
    return {
      transactionId: getItem('MpesaReceiptNumber') || cb.CheckoutRequestID || `STK-${Date.now()}`,
      amount: Number(getItem('Amount') || 0),
      phoneNumber: String(getItem('PhoneNumber') || ''),
      accountReference: getItem('AccountReference') || '',
      transactionDate: getItem('TransactionDate')
        ? (() => {
            const dt = String(getItem('TransactionDate'));
            if (dt.length === 14) return `${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}T${dt.slice(8,10)}:${dt.slice(10,12)}:${dt.slice(12,14)}+03:00`;
            return new Date().toISOString();
          })()
        : new Date().toISOString(),
    };
  }

  // Already normalized format (our own system posting)
  if (body.transactionId && body.amount) {
    return {
      transactionId: body.transactionId,
      amount: Number(body.amount),
      phoneNumber: body.phoneNumber || '',
      accountReference: body.accountReference || '',
      transactionDate: body.transactionDate || new Date().toISOString(),
    };
  }

  return null;
}

export async function registerC2BUrls(paybillShortcode: string, confirmationUrl: string, validationUrl?: string) {
  const accessToken = await mpesaAuth.getToken();

  const payload = {
    ShortCode: paybillShortcode,
    ResponseType: 'Completed',
    ConfirmationURL: confirmationUrl,
    ValidationURL: validationUrl || confirmationUrl,
  };

  const res = await fetchWithTimeout(`${BASE_URL}/mpesa/c2b/v2/register`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, 15000);

  const data = await res.json();
  if (!res.ok) throw new AppError(`C2B registration failed: ${data.errorMessage || res.status}`, 502);
  return data;
}
