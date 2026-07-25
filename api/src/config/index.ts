import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiry: process.env.JWT_EXPIRY || '7d',
  },
  
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY || '',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
    passkey: process.env.MPESA_PASSKEY || '',
    shortcode: process.env.MPESA_SHORTCODE || '174379',
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MPESA_CALLBACK_URL || '',
  },
  
  sms: {
    apiKey: process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || '',
    apiUrl: process.env.SMS_API_URL || '',
    partnerID: process.env.SMS_PARTNER_ID || '',
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    publicUrlBase: process.env.R2_PUBLIC_URL_BASE || '',
  },
  sentryDsn: process.env.SENTRY_DSN || '',
};

export function validateConfig(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_PASSKEY',
    'SMS_API_KEY',
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
