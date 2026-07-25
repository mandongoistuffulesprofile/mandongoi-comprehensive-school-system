# Secrets Rotation — Mandongoi School System

## Exposed Secrets (Must Rotate Before Production)

The following credentials were found in `api/.env` (plaintext on disk):

| Secret | Value (redacted) | Risk |
|--------|-----------------|------|
| `JWT_SECRET` | `5868eb8b...` | Token forgery if leaked |
| `MPESA_CONSUMER_KEY` | `uScsRV6...` | M-Pesa API access |
| `MPESA_CONSUMER_SECRET` | `rYoVNv9...` | M-Pesa API access |
| `MPESA_PASSKEY` | `bfb279f9...` | Webhook signature forgery |
| `SMS_API_KEY` | `054521fe...` | Bulk SMS abuse |
| `SMS_PARTNER_ID` | `16428` | SMS provider access |

## Rotation Procedure

### JWT_SECRET
```bash
openssl rand -hex 32
```
Set as `JWT_SECRET` in Render dashboard. Old tokens become invalid immediately.

### M-Pesa Credentials
1. Log in to Safaricom Developer Portal
2. Regenerate consumer key + secret
3. Update `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` in Render env vars
4. Update `MPESA_PASSKEY` if changed in portal

### SMS API Key
1. Log in to Advanta Africa dashboard
2. Regenerate API key
3. Update `SMS_API_KEY` in Render env vars

## Best Practices
- Set `JWT_SECRET` to `generateValue: true` in `render.yaml` for auto-generation
- Never commit `.env` files (already in `.gitignore`)
- Use Render's `sync: false` for all secrets (already configured)
- Rotate M-Pesa credentials every 90 days
- Rotate JWT_SECRET if any developer leaves
