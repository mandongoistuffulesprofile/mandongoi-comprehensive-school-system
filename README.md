# Mandongoi Comprehensive School Management System

School management platform with M-Pesa fee payments, attendance, academics, staff payroll, food programme tracking, and SMS communication.

## Structure

```
├── api/              Node/Express/Drizzle/PostgreSQL backend
├── frontend/         React/Vite frontend
├── .github/workflows/  CI/CD + backup automation
├── docker-compose.yml  Full-stack Docker setup
├── nginx.conf        Production reverse proxy config
└── render.yaml       Render.com deployment config
```

## Deploy

### Backend → Render

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect your repo
3. Set **Root Directory** to `api`
4. Render auto-detects `render.yaml` — apply it
5. Add a PostgreSQL database (Render → New → PostgreSQL)
6. Copy the **Internal Database URL** and set it as `DATABASE_URL` in your service's env vars
7. Add remaining env vars from your `.env` file (M-Pesa keys, SMS keys, etc.)

### Frontend → Cloudflare Pages

1. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create a project
2. Connect your GitHub repo → Set **Root Directory** to `frontend`
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output:** `dist`
4. Environment variable: `VITE_API_BASE_URL=https://your-render-app.onrender.com`
5. Click **Save and Deploy**
6. Add custom domain: Go to Pages project → Custom domains → `mandongoicomprehensive.sc.ke`

The `frontend/public/_redirects` file ensures client-side routing works on Cloudflare Pages.

## Backups (Automatic)

A GitHub Actions workflow runs every Sunday at 2 AM and uploads a database backup as an artifact. You can also trigger it manually:

1. Go to your repo on GitHub → **Actions** tab
2. Select **Database Backup** workflow
3. Click **Run workflow** → **Run**

Backups are stored for 90 days. Download them from the workflow run page.

### Manual restore

```bash
gunzip mandongoi_20260720_020001.sql.gz
psql DATABASE_URL < mandongoi_20260720_020001.sql
```

## Quick Start (Local Dev)

```bash
# Backend
cd api
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```
