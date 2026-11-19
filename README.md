# finister

Multi-tenant practice management for Indian CA firms — clients, engagements, GST invoicing,
payments with TDS tracking, and a statutory compliance calendar.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Postgres** via Drizzle ORM — embedded **PGlite** for local dev, any Postgres URL for prod
- **Better Auth** (email/password + organization plugin) — an *organization* is a tenant (firm)
- **shadcn/ui** (Base UI) + Tailwind v4
- Server Actions for all mutations; money stored as **paise (bigint)**

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000 — sign in with admin / admin (seeded in dev), or register your own firm
```

No database setup needed for dev — PGlite stores data in `.data/pg`.
For a real database, set `DATABASE_URL` in `.env.local` and restart; migrations run automatically at boot.

## Modules

| Route | What it does |
|---|---|
| `/dashboard` | Outstanding, collections, TDS receivable, deadlines |
| `/clients` | Client master (PAN/GSTIN/state), staff assignment, per-client ledger |
| `/invoices` | GST invoices — auto CGST/SGST vs IGST by firm vs client state, FY-wise numbering `INV/26-27/001` |
| `/payments` | Receipts with **TDS deduction** (194J) — credit = received + TDS; FY TDS register |
| `/compliance` | Auto-generated deadlines from engagements (GSTR-1/3B, TDS, ITR, advance tax, ROC, audit) |
| `/settings` | Firm profile, service catalog (category drives compliance), team invites |

## Roles

`owner` · `admin` (manager) · `member` (staff) — mapped from better-auth org roles.

## Schema notes

- Every app table carries `organization_id` — all queries are tenant-scoped via `getCtx()` in `src/lib/tenant.ts`.
- Gapless invoice/receipt numbering via `tenant_counter` (org, kind, FY) with `ON CONFLICT` upsert.
- Compliance task templates live in `src/lib/compliance.ts` — engagements auto-generate tasks for the current FY.
