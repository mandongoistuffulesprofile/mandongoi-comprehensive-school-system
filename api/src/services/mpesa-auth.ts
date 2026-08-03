import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { BASE_URL } from '../utils/mpesa';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';

export class MpesaAuthService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  private get consumerKey() {
    return config.mpesa.consumerKey;
  }

  private get consumerSecret() {
    return config.mpesa.consumerSecret;
  }

  private get isConfigured() {
    return !!(this.consumerKey && this.consumerSecret);
  }

  async getToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.isConfigured) {
      throw new AppError('M-Pesa Daraja credentials are not configured', 500);
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    const res = await fetchWithTimeout(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new AppError(`Failed to obtain M-Pesa access token: ${body}`, 502);
    }

    const json = (await res.json()) as { access_token: string; expires_in: string | number };

    this.accessToken = json.access_token;
    const expiresIn = Number(json.expires_in);
    this.tokenExpiry = Number.isFinite(expiresIn) && expiresIn > 0
      ? Date.now() + (expiresIn - 60) * 1000
      : Date.now() + 3600 * 1000;

    return this.accessToken;
  }

  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

export const mpesaAuth = new MpesaAuthService();
