# FlowTrace — Claude Code Context

## Project overview
FlowTrace is a personal finance tracker for individual/small investors.
Stack: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase
(PostgreSQL + Auth) · Recharts · Vercel.

Goal: low-friction transaction entry (<10s), visual dashboards, monthly
automated reports. Currently in MVP phase (weeks 1–4).

## Repository structure
flowtrace/
├── src/
│   ├── app/
│   │   ├── (auth)/              # login, signup pages (unauthenticated)
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── (dashboard)/         # protected pages
│   │   │   ├── page.tsx         # Dashboard — asset overview + net flow chart
│   │   │   ├── timeline/        # Timeline — daily transaction feed
│   │   │   └── analytics/       # Analytics — full-screen charts
│   │   └── api/                 # Route handlers
│   ├── components/
│   │   ├── ui/                  # Base components (Button, Input, Modal…)
│   │   └── charts/              # Recharts wrappers
│   ├── hooks/                   # Custom React hooks (useTransactions, etc.)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts        # Browser client (createBrowserClient)
│   │       ├── server.ts        # Server client (createServerClient + cookies)
│   │       └── middleware.ts    # Session refresh helper
│   └── types/                   # Shared TypeScript types
├── middleware.ts                 # Route protection — redirects to /login
├── CLAUDE.md                     # This file
└── AGENTS.md                     # General AI agent context

## Database (Supabase / PostgreSQL)
Schema lives in supabase/schema.sql. Core tables:

- users          — managed by Supabase Auth (auth.users)
- ledgers        — account books per user (personal, investment, business)
- categories     — expense/income categories; null user_id = system default
- transactions   — core ledger entries (income | expense | transfer)
- recurring_rules — rules for auto-generating periodic transactions
- budgets        — per-category monthly spending limits
- monthly_reports — cached aggregate reports (generated on 1st of month)

RLS is enabled on all tables. Users can only read/write their own data.
System categories (user_id IS NULL) are readable by all authenticated users.

Key field notes:
- transactions.type: "income" | "expense" | "transfer"
- transactions.transfer_pair_id: self-reference linking two legs of a transfer
- transactions.payment_method: "cash" | "card" | "e-wallet" | "bank_transfer"
- categories.type: "income" | "expense"
- ledgers.type: "personal" | "investment" | "business"
- ledgers.currency: default "MYR" (Malaysian Ringgit)

## Supabase client usage rules
IMPORTANT — always use the correct client for the context:

Server Components, Route Handlers, Server Actions:
  import { createClient } from "@/lib/supabase/server"
  const supabase = createClient()

Client Components (with "use client"):
  import { createClient } from "@/lib/supabase/client"
  const supabase = createClient()

Never import the server client in a client component.
Never import the browser client in a server context.

## Authentication
Auth is handled entirely by Supabase Auth (not NextAuth).
- Email/password login is the primary method
- OAuth providers (Google) can be added later in Supabase dashboard
- Session is managed via cookies using @supabase/ssr
- middleware.ts refreshes the session on every request and protects
  /dashboard, /analytics, /timeline — redirects to /login if no session
- To get the current user in a Server Component:
  const { data: { user } } = await supabase.auth.getUser()

## Environment variables
NEXT_PUBLIC_SUPABASE_URL       — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  — Supabase anon/public key

Both are prefixed NEXT_PUBLIC_ and safe to use in client components.
Never use the service_role key in client-side code.

## Coding conventions
- All components are functional, typed with TypeScript. No class components.
- File naming: kebab-case for files (transaction-row.tsx), PascalCase for
  component names (TransactionRow).
- Prefer Server Components by default. Add "use client" only when needed
  (event handlers, browser APIs, useState/useEffect).
- Data fetching happens in Server Components or Route Handlers — never
  fetch Supabase directly inside a useEffect in a client component.
- All monetary amounts are stored as NUMERIC(12,2) in the DB and handled
  as strings from Supabase. Parse with parseFloat() before arithmetic.
  Always display with toLocaleString("en-MY", { style: "currency", currency: "MYR" }).
- Dates: store as DATE in DB (YYYY-MM-DD string from Supabase). Use
  date-fns for all date manipulation. Never use new Date() directly on
  a date string without handling timezone offset.

## UI conventions
refer to UI/UX Pro Max Skills

## Charts (Recharts)
All chart components live in src/components/charts/.
- NetFlowChart     — line chart, monthly income vs expense overlay
- CategoryPieChart — pie/donut chart for expense breakdown
- TrendChart       — current vs previous month spending overlap
Recharts components must be in client components ("use client").
Wrap data fetching in a Server Component parent that passes data as props.

## Current progress
Update this section as features are completed:
- [x] Next.js project initialised
- [x] Supabase client files created (client.ts, server.ts, middleware.ts)
- [x] Route protection middleware configured
- [x] Schema pushed to Supabase (supabase/schema.sql)
- [x] Auth pages (login, signup)
- [x] Transaction CRUD
- [x] Dashboard page
- [x] Timeline page
- [ ] Analytics page
- [ ] Monthly report logic
- [ ] Dark mode
- [ ] PDF export

## Commands
npm run dev      — start dev server at localhost:3000
npm run build    — production build (run before committing)
npm run lint     — ESLint check

## Do not
- Do not use the Supabase service_role key anywhere in the codebase
- Do not fetch data inside useEffect — use Server Components instead
- Do not install additional database libraries (Prisma, Drizzle, etc.)
- Do not use pages/ router — this project uses App Router only
- Do not hardcode user IDs or any credentials
- Do not create new Supabase client instances inline — always import
  from @/lib/supabase/client or @/lib/supabase/server