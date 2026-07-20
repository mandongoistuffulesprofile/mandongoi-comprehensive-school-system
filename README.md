# Mandongoi Comprehensive School Management System

School management platform with M-Pesa fee payments, attendance, academics, staff payroll, food programme tracking, and SMS communication.

## Structure

```
├── api/              Node/Express/Drizzle/PostgreSQL backend
├── frontend/         React/Vite frontend
├── docker-compose.yml  Full-stack Docker setup
├── nginx.conf        Production reverse proxy config
└── scripts/          Utility scripts (backup, etc.)
```

## Quick Start

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

## Deploy

See `render.yaml` for Render deployment or `docker-compose.yml` for VPS deployment.
