# Go-Live Checklist — Mandongoi Comprehensive School

## Things I Need From the School Head

### 1. M-Pesa Paybill (for fee payments)

| Item | What to do |
|------|------------|
| Existing Paybill number | Share the 5-6 digit Paybill number the school already uses |
| M-Pesa Business Admin username | The username Safaricom gave you to login at safaricom.co.ke/business |
| Consent to connect to API | I'll submit the Go-Live request on the Safaricom Developer Portal — Safaricom will approve it against your Paybill |

> **What this enables:** Parents pay fees via M-Pesa → system auto-matches payment to student invoice → receipt sent via SMS. No manual reconciliation.

### 2. School Information (for system setup)

| Item | Example | Needed for |
|------|---------|------------|
| School name | Mandongoi Comprehensive School | System branding, SMS sender name |
| School phone | +254 7XX XXX XXX | Staff/guardian contact |
| School email | info@mandongoicomprehesive.sc.ke | Admin notifications |
| Physical address | P.O. Box XXX, Nairobi | Report cards, official documents |
| Current term + year | Term 1, 2026 | Fee structures, attendance periods |
| Term dates | Start/end dates for each term | SMS scheduling, attendance tracking |
| School motto (optional) | "Strive for Excellence" | Report cards, system header |
| Pay day for staff | e.g. 25th of each month | Payroll scheduling |

### 3. Staff List

| Item | Needed for |
|------|------------|
| Full names | Creating staff accounts |
| Phone numbers | SMS communication |
| Teacher type | BOM (monthly salary) or TSC (extra duty only) |
| Employment type | Flat rate or session-based |
| Salary/rate amounts | Payroll setup |
| Subject/class assignments | Session assignments, class teacher allocation |

### 4. Student & Fee Information

| Item | Needed for |
|------|------------|
| Student names, grades, classes | Student profiles |
| Fee structures per grade | Invoice generation |
| Boarding vs day status | Fee calculation |
| Food program type | Pay fee, bring own, or none |
| Guardian names and phones | SMS notifications, parent portal |

### 5. SMS Sender Setup

| Item | What to do |
|------|------------|
| Advanta Africa SMS account | We already have API keys — just need you to confirm the Sender ID (e.g., "Mandongoi") |
| Opt-in consent | Confirm guardians have consented to receive school SMS |

---

## Cost Breakdown

### One-Time Setup

| Item | Cost (KES) | Notes |
|------|------------|-------|
| System setup & configuration | **Free** (included in development) | Already done |
| Total one-time | **KES 0** | |

### Monthly / Annual Costs

| Item | Cost (KES) | Frequency | Notes |
|------|------------|-----------|-------|
| **Domain** (`mandongoicomprehesive.sc.ke`) | **350** | First year | Then KSh 1,200/year renewal — via HostPinnacle |
| **Backend hosting** (Render) | **0** | Monthly | Free tier — sleeps after 15 min idle, wakes on demand |
| **Frontend hosting** (Vercel) | **0** | Monthly | Free tier — 100 GB bandwidth/month |
| **Database** (Render PostgreSQL) | **0** | Monthly | Free tier — 1 GB storage |
| **Error monitoring** (Sentry) | **0** | Monthly | Free tier — 5k events/month |
| **SMS credits** (Advanta Africa) | ~**0.50 per SMS** | Per usage | ~KES 0.50 per message. Estimate: 500 SMS/term ≈ KES 250/term |

### Total First Year

| Item | Amount |
|------|--------|
| Domain (year 1) | KES 350 |
| Hosting (all services) | KES 0 |
| SMS (estimated per term) | KES 250 |
| **Total year 1** | **KES 350 (≈ $2.70 USD)** |

### Year 2+ (recurring)

| Item | Amount |
|------|--------|
| Domain renewal | KES 1,200/year |
| Hosting | KES 0 |
| SMS | ~KES 750/year (3 terms) |
| **Total per year** | **≈ KES 2,000 (≈ $15 USD)** |

> **No hidden costs.** The system runs on free-tier cloud infrastructure. The only paid line items are the domain name and SMS credits.

---

## What the School Gets After Go-Live

| Feature | Ready? |
|---------|--------|
| ✅ Online fee payments via M-Pesa (auto-matching) | Ready |
| ✅ SMS reminders for fees, attendance, results | Ready |
| ✅ Student profiles, attendance, report cards | Ready |
| ✅ Staff management + payroll | Ready |
| ✅ Food programme tracking (bring own / pay fee) | Ready |
| ✅ Class teachers with signature upload | Ready |
| ✅ Session assignments (morning/evening/weekend) | Ready |
| ✅ Accounting ledger + trial balance | Ready |
| ✅ Parent portal access | Ready |
| ✅ Custom domain (`mandongoicomprehesive.sc.ke`) | After domain purchase |

---

## Next Steps (ordered)

```
[ ] School head reviews and confirms this checklist
[ ] Share existing Paybill number + M-Pesa admin username
[ ] Share school info (name, phone, email, address, term dates)
[ ] Share staff list (names, phone, role, salary)
[ ] Share student data (can be imported from Excel)
[ ] Purchase domain: mandongoicomprehesive.sc.ke (KES 350)
[ ] I deploy the system to production
[ ] I submit Go-Live to Safaricom using the Paybill
[ ] Test a payment: send KES 1 to Paybill → verify auto-match
[ ] Train staff on the system
[ ] Go live!
```

**Total time from confirmation to go-live:** 2–3 days (waiting on Safaricom Go-Live approval is the variable).
