import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { mpesaAuth } from './mpesa-auth';
import { BASE_URL, generateTimestamp, normalizePhone } from '../utils/mpesa';
import { logger } from '../utils/logger';
import { fetchWithRetry } from '../utils/fetchWithTimeout';
import { circuitCall } from '../utils/circuitBreaker';

export type StkPushInput = {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  description?: string;
  callbackUrl?: string;
};

export async function initiateStkPush(input: StkPushInput) {
  const { passkey, shortcode, callbackUrl } = config.mpesa;

  if (!passkey || !shortcode) {
    throw new AppError('M-Pesa Daraja credentials are not configured', 500);
  }

  const callback = input.callbackUrl || callbackUrl;
  if (!callback) {
    throw new AppError('M-Pesa callback URL is not configured', 500);
  }

  const accessToken = await circuitCall('mpesa-auth', () => mpesaAuth.getToken());

  const ts = generateTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64');
  const phone = normalizePhone(input.phoneNumber);

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: input.amount,
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: callback,
    AccountReference: input.accountReference,
    TransactionDesc: input.description || 'School fees',
  };

  const pushRes = await circuitCall('mpesa-stkpush', () => fetchWithRetry(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }, 15000));

  const data = await pushRes.json();
  if (!pushRes.ok) {
    throw new AppError(`M-Pesa STK push request failed: ${data.errorMessage || pushRes.status}`, 502);
  }

  return data;
}
