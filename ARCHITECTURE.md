```mermaid
C4Context
  title System Context — Mandongoi Comprehensive School System

  Person(admin, "School Admin", "Manages students, fees, staff, payroll, SMS")
  Person(teacher, "Teacher", "Marks attendance, enters assessments, generates report cards")
  Person(accountant, "Accountant", "Fee invoices, payments, ledger, reports")
  Person(parent, "Parent", "Views child attendance, invoices, report cards")
  Person(guardianPhone, "Guardian (Phone)", "Receives SMS notifications")

  System_Boundary(school_system, "School Management System") {
    System(frontend, "React/Vite Frontend", "Cloudflare Pages")
    System(backend, "Express API Server", "Render.com / Docker")
    System(db, "PostgreSQL Database", "Neon / Self-hosted")
  }

  System_Ext(mpesa, "Safaricom M-Pesa Daraja", "STK Push, C2B Webhooks")
  System_Ext(sms, "Advanta Africa SMS", "Bulk SMS delivery")
  System_Ext(sentry, "Sentry", "Error monitoring")

  Rel(admin, frontend, "Uses", "HTTPS")
  Rel(teacher, frontend, "Uses", "HTTPS")
  Rel(accountant, frontend, "Uses", "HTTPS")
  Rel(parent, frontend, "Uses", "HTTPS")

  Rel(frontend, backend, "REST API calls", "JSON/HTTPS")
  Rel(backend, db, "Drizzle ORM queries", "Postgres protocol")
  Rel(backend, mpesa, "STK Push requests", "HTTPS REST")
  Rel(mpesa, backend, "Payment webhooks", "POST /api/invoices/mpesa/webhook")
  Rel(backend, sms, "Send SMS", "HTTPS REST")
  Rel(guardianPhone, sms, "Receives SMS", "GSM")
  Rel(backend, sentry, "Error reports", "HTTPS")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

```mermaid
C4Container
  title Container Diagram — Backend Components

  Person(admin, "School Admin")
  Person(parent, "Parent")

  System_Boundary(backend, "API Server (Node/Express)") {
    Container(web, "Express HTTP Server", "Node.js + Express 4", "Routes, middleware, auth, rate limiting")
    Container(schedulers, "Background Schedulers", "In-process setInterval", "SMS reminders, overdue checks, attendance checks, payment reminders")
    ContainerDb(pg, "PostgreSQL", "Neon / Local", "26 tables: users, students, fees, ledger, payroll, SMS, attendance, etc.")

    Boundary(services, "Business Logic Services") {
      Container(fees, "Fee Service", "fees.ts", "Invoice generation, payment matching, balance tracking")
      Container(mpesa_svc, "M-Pesa Service", "mpesa.ts", "STK Push initiation, webhook parsing, retry logic")
      Container(sms_svc, "SMS Service", "sms.ts", "Template rendering, send orchestration, opt-out enforcement")
      Container(ledger, "Ledger Service", "ledger.ts", "Double-entry journal posting, trial balance")
      Container(payroll, "Payroll Service", "payroll.ts", "Run creation, entry generation, approval workflow")
      Container(auth_svc, "Auth Service", "auth.ts middleware", "JWT verification, RBAC enforcement")
    }
  }

  Rel(admin, web, "HTTP requests", "HTTPS")
  Rel(parent, web, "HTTP requests", "HTTPS")
  Rel(web, services, "Delegates to")
  Rel(services, pg, "Drizzle ORM", "SQL")
  Rel(schedulers, services, "Triggers periodic jobs")
  Rel(mpesa_svc, "Safaricom M-Pesa", "STK Push")
  Rel(mpesa_svc, "Safaricom M-Pesa", "C2B Webhook")
  Rel(sms_svc, "Advanta SMS API", "HTTPS POST")
```

```mermaid
C4Dynamic
  title Dynamic Diagram — M-Pesa Fee Payment Flow

  Person(parent, "Parent")
  System(admin_ui, "Admin UI")
  System(backend, "Express API")
  System(mpesa_api, "M-Pesa Daraja")
  System(sms_provider, "Advanta SMS")

  Rel(admin_ui, backend, "1. POST /api/invoices/mpesa/stk-push { phone, amount, accountRef }", "HTTPS")
  Rel(backend, mpesa_api, "2. POST /mpesa/stkpush/v1/processrequest (with retry, max 3 attempts)", "HTTPS")
  Rel(mpesa_api, parent, "3. STK Push prompt on phone", "USSD")
  Rel(parent, mpesa_api, "4. User enters M-Pesa PIN", "USSD")
  Rel(mpesa_api, backend, "5. POST /api/invoices/mpesa/webhook (idempotent, ON CONFLICT DO NOTHING)", "HTTPS")
  Rel(backend, backend, "6. Parse payload → insert mpesaTransactions → match by accountRef → update invoice → post ledger entry → issue receipt")
  Rel(backend, sms_provider, "7. Send payment receipt SMS to guardian", "HTTPS")
  Rel(backend, admin_ui, "8. Response: { success, data }", "JSON")
```

```mermaid
C4Deployment
  title Deployment Diagram

  Deployment_Node(cf, "Cloudflare", "Global Edge") {
    Container(frontend, "React/Vite Static Site", "Cloudflare Pages, dist/")
  }

  Deployment_Node(render, "Render.com", "US Region") {
    Container(api, "Express API Server", "Node 20, free plan")
  }

  Deployment_Node(neon, "Neon Serverless Postgres", "AWS US East") {
    ContainerDb(db, "PostgreSQL 15", "Free tier, scale-to-zero")
  }

  Rel(frontend, api, "REST API", "HTTPS")
  Rel(api, db, "Pooled connection", "Postgres, max 10 connections")

  Deployment_Node(external, "External Services") {
    Container(mpesa, "Safaricom M-Pesa", "Kenya")
    Container(sms, "Advanta SMS API", "Kenya")
    Container(sentry, "Sentry", "US/EU")
  }

  Rel(api, mpesa, "STK Push + C2B", "HTTPS")
  Rel(api, sms, "Bulk SMS", "HTTPS")
  Rel(api, sentry, "Error reporting", "HTTPS")
  Rel(frontend, sentry, "Error reporting", "HTTPS")
```

```mermaid
flowchart TD
    subgraph "Schedulers (in-process setInterval)"
        S1["SMS Scheduler (5 min)"] --> fees["evaluateAndSend()"]
        S2["Payment Reminder (1 hr)"] --> fees
        S3["Overdue Checker (1 hr)"] --> fees
        S4["Attendance Checker (6 hr)"] --> eval["evaluateLowAttendance()"]
    end

    subgraph "Single Point of Failure"
        PROC["Single Express Process\n(Node.js, no cluster)"]
        DB["Single PostgreSQL Instance\n(Neon, no replica)"]
    end

    subgraph "Missing Resilience Patterns"
        MISSING1["No message queue\n(jobs run in-process)"]
        MISSING2["No circuit breaker\n(M-Pesa / SMS)"]
        MISSING3["No caching layer\n(every request hits DB)"]
        MISSING4["No autoscaling\n(single instance)"]
    end

    PROC --> S1
    PROC --> S2
    PROC --> S3
    PROC --> S4
    PROC --> DB
```

---
## Architecture Notes

### Single Points of Failure
- Single Express process — if it dies, the entire API + all schedulers die
- Single PostgreSQL instance — no read replicas, no failover
- No process supervisor (PM2/systemd) in Dockerfile CMD

### External Dependencies
| Service | Protocol | Failure Mode |
|---------|----------|-------------|
| M-Pesa Daraja | HTTPS REST | STK push has retry (3 attempts, exponential backoff + jitter). Webhook is inbound (Safaricom calls us) — if we're down, payment still processes on M-Pesa side, webhook retries later |
| Advanta SMS | HTTPS REST | Single attempt, no retry. Failure is logged but not retried |
| Sentry | HTTPS | Non-blocking — failure to report doesn't affect app |

### Data Flow
1. User → Cloudflare Pages (React SPA) → HTTPS API calls → Render Express API
2. Express validates JWT (authMiddleware) → enforces role (requireRole) → calls service → queries PostgreSQL via Drizzle
3. Fee payment flow: Admin initiates STK Push → Backend calls M-Pesa API → User enters PIN on phone → M-Pesa calls webhook → Backend idempotently processes payment → Updates invoice/ledger → Sends SMS receipt
