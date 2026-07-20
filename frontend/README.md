# CBC School Manager — Frontend

React + TypeScript + Vite + Tailwind frontend for the Multi-Tenant School Management System backend
(`https://github.com/BrianBarakaInfosecProjects/Muti_Tenat_school_management_system`).

## Setup

```bash
npm install
cp .env.example .env   # then set VITE_API_BASE_URL to your backend's URL
npm run dev
```

Build for production: `npm run build` (outputs to `dist/`).

## Design system

- Colors: deep slate-navy (#12222E), unbleached paper (#F7F3EA), ochre-gold accent (#B8863B),
  sage green for paid/positive states (#3D6B52), brick red for overdue/negative states (#A8432F).
- Type: Source Serif 4 for headings, Inter for UI, IBM Plex Mono for all tabular numbers (money, IDs, dates).
- Signature motif: CompetencyDots — the real 1-4 CBC performance-level dots, reused as a status marker.
- Cards use a left-edge color stripe (gold/sage/brick) to encode state at a glance.

## Architecture

- src/lib/api.ts — fetch wrapper; unwraps the backend's { success, data } envelope, injects the
  bearer token, and clears it on 401.
- src/lib/auth.ts — zustand auth store (login, logout, hydrate via /auth/me).
- src/api/*.ts — one typed module per backend route group, matching the verified request/response
  shapes exactly.
- src/components/ui/ResourcePage.tsx — generic list + create/edit modal + delete, used by every
  simple CRUD screen (students, staff, fee structures, ledger accounts, SMS templates, etc).
- src/components/layout/ — AppShell, role-driven Sidebar, Topbar, and RequireAuth/RequireRole guards.
- src/pages/ — one folder per feature area, mirroring the backend's route groups.

## Known gap: Parent Links (pending backend work)

The backend doesn't yet expose an endpoint to manage parentStudentLinks (assigning a parent user to
their child) — the table and the record-scoping middleware exist, but there's no route. This is
isolated in src/api/parentLinks.ts: every call currently throws a clear "not implemented" error, and
the Parent Links admin page (src/pages/parents/ParentLinks.tsx) surfaces that plainly instead of
silently failing. Once the backend adds:

```
GET    /api/parent-links?studentId=...
POST   /api/parent-links        { userId, studentId }
DELETE /api/parent-links/:id
```

only src/api/parentLinks.ts needs to change — no component using it needs to be touched.

## Role coverage

| Role | Access |
|---|---|
| schoolAdmin | Everything |
| accountant | Students (read), Fees, Invoices, Staff, Payroll, Ledger, SMS |
| teacher | Students, Academic (learning areas/report cards), Attendance, Timetable |
| parent | Dashboard only, pending the Parent Links gap above |

## Notes / things to wire up next

- Assessment entry (per learning area/strand) has a read-only tab on the student detail page; a full
  entry form needs a learning-area/strand picker.
- Report card compiledResults is submitted as a placeholder object — swap in real aggregation from
  assessments when ready.
- M-Pesa STK push on the Invoices page leaves phoneNumber blank by default — hook it to the invoice's
  guardian phone once that lookup is wired.
