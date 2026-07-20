# Incident Response Runbook — Mandongoi School System

## Contact

| Role | Person | Phone |
|------|--------|-------|
| Developer | [Name] | [Phone] |
| School Admin | [Name] | [Phone] |
| Database access | Via Render dashboard | — |

---

## Incident 1: Application Down / 502 Errors

**Symptoms:** `GET /health` returns 5xx, users see error page.

**Check:**
```bash
curl https://api.mandongoicomprehensive.sc.ke/health
```

**If not responding:**
1. Check Render dashboard → Service → Logs tab for crash reason
2. Check Sentry for recent errors
3. Restart: Render → Service → Manual Deploy → Deploy latest image

**If DB connection error:**
```bash
# Check if DB is reachable from Render shell
npx tsx -e "import { pool } from './src/db'; pool.query('SELECT 1').then(r => { console.log('OK', r); process.exit(0); })"
```

**Resolution:** ~5 minutes. Restart usually resolves transient issues.

---

## Incident 2: M-Pesa Payments Not Matching

**Symptoms:** Parents report paying but invoice not updated. Unmatched transactions on Reconciliation page.

**Check:**
```bash
# Check recent logs for webhook errors
grep "webhook\|mpesa\|M-Pesa" /var/log/app/error.log | tail -20
```

**Common causes:**
- Safaricom callback URL changed (check `MPESA_CALLBACK_URL` env var)
- Paybill credentials expired (check `MPESA_CONSUMER_KEY/SECRET`)
- Webhook HMAC mismatch (check `MPESA_PASSKEY` in production)

**Resolution:**
1. Go to Reconciliation page → find unmatched transaction → manually match to invoice
2. If webhook not arriving: check `registerC2BUrls` was called correctly
3. If credentials expired: regenerate from Safaricom portal

**Escalation:** If payments are failing entirely (not just matching), call developer immediately — this is revenue-critical.

---

## Incident 3: SMS Not Sending

**Symptoms:** Parents not receiving SMS reminders, payment receipts, or attendance alerts.

**Check:**
```bash
# Check SMS provider configuration
grep "SMS\|sms\|Advanta" /var/log/app/error.log | tail -10
```

**Common causes:**
- Advanta Africa API key expired or quota exhausted
- SMS sender ID not approved (new sender IDs need registration)
- Guardian phone numbers missing or incorrect

**Resolution:**
1. Log in to Advanta Africa dashboard → check account balance and API key status
2. Verify `SMS_API_KEY` and `SMS_SENDER_ID` in environment variables
3. Check guardian records for missing/invalid phone numbers

---

## Incident 4: Database Full / Slow Queries

**Symptoms:** System feels sluggish, pages timeout, `GET /health` returns slow.

**Check:**
```bash
# Check DB size
curl -H "Authorization: Bearer ADMIN_TOKEN" https://api.mandongoicomprehensive.sc.ke/api/admin/metrics
```

**Resolution:**
1. If DB > 800 MB: Upgrade Render PostgreSQL from free to $7/month plan
2. If slow queries: Check `psql` for long-running queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle' ORDER BY duration DESC;
   ```
3. Kill stuck queries: `SELECT pg_terminate_backend(pid);`

---

## Incident 5: Security / Unauthorized Access

**Symptoms:** Suspicious activity in audit logs, unknown user accounts.

**Immediate actions:**
1. Rotate `JWT_SECRET` in environment variables
2. Force all users to re-login (JWT tokens become invalid)
3. Check audit logs for the suspicious activity
4. Revoke any compromised user accounts

**Report:** Document the incident in a post-mortem within 24 hours.

---

## Regular Maintenance

| Task | Frequency | Who |
|------|-----------|-----|
| Check backup (`scripts/backup.sh`) | Weekly | Developer |
| Review Sentry errors | Weekly | Developer |
| Check DB size | Monthly | Developer |
| Verify M-Pesa credentials expiry | Monthly | Developer |
| Update dependencies (`npm audit`) | Monthly | Developer |
| Test restore from backup | Quarterly | Developer |
