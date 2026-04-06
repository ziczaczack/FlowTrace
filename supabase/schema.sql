-- FlowTrace Database Schema
-- Paste into Supabase SQL Editor and run

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────
-- 1. LEDGERS (账套)
-- ──────────────────────────────────────
create table ledgers (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  type         text        not null default 'personal',
  -- type: 'personal' | 'investment' | 'business'
  currency     text        not null default 'MYR',
  icon         text        default '💼',
  is_default   boolean     default false,
  created_at   timestamptz default now()
);

-- ──────────────────────────────────────
-- 2. CATEGORIES (分类)
-- ──────────────────────────────────────
create table categories (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        references auth.users(id) on delete cascade,
  -- null user_id = system default category
  name         text        not null,
  icon         text        default '📦',
  color        text        default '#7F77DD',
  type         text        not null default 'expense',
  -- type: 'income' | 'expense'
  created_at   timestamptz default now()
);

-- ──────────────────────────────────────
-- 3. RECURRING RULES (周期性账单规则)
-- ──────────────────────────────────────
create table recurring_rules (
  id             uuid        primary key default gen_random_uuid(),
  ledger_id      uuid        not null references ledgers(id) on delete cascade,
  category_id    uuid        references categories(id),
  name           text        not null,
  amount         numeric(12,2) not null,
  frequency      text        not null default 'monthly',
  -- frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  day_of_month   int,
  next_due       date        not null,
  is_active      boolean     default true,
  created_at     timestamptz default now()
);

-- ──────────────────────────────────────
-- 4. TRANSACTIONS (交易记录 — 核心表)
-- ──────────────────────────────────────
create table transactions (
  id                 uuid          primary key default gen_random_uuid(),
  ledger_id          uuid          not null references ledgers(id) on delete cascade,
  category_id        uuid          references categories(id),
  recurring_rule_id  uuid          references recurring_rules(id),
  transfer_pair_id   uuid          references transactions(id),
  -- self-ref: links two legs of a transfer
  amount             numeric(12,2) not null,
  type               text          not null,
  -- type: 'income' | 'expense' | 'transfer'
  payment_method     text,
  -- 'cash' | 'card' | 'e-wallet' | 'bank_transfer'
  note               text,
  txn_date           date          not null default current_date,
  created_at         timestamptz   default now()
);

-- ──────────────────────────────────────
-- 5. BUDGETS (预算)
-- ──────────────────────────────────────
create table budgets (
  id             uuid          primary key default gen_random_uuid(),
  user_id        uuid          not null references auth.users(id) on delete cascade,
  category_id    uuid          not null references categories(id),
  amount_limit   numeric(12,2) not null,
  period         text          not null default 'monthly',
  created_at     timestamptz   default now(),
  unique(user_id, category_id, period)
);

-- ──────────────────────────────────────
-- 6. MONTHLY REPORTS (月度报告缓存)
-- ──────────────────────────────────────
create table monthly_reports (
  id                 uuid          primary key default gen_random_uuid(),
  user_id            uuid          not null references auth.users(id) on delete cascade,
  year               int           not null,
  month              int           not null,
  total_income       numeric(12,2),
  total_expense      numeric(12,2),
  net_flow           numeric(12,2),
  category_breakdown jsonb,
  anomalies          jsonb,
  generated_at       timestamptz   default now(),
  unique(user_id, year, month)
);

-- ──────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────
alter table ledgers          enable row level security;
alter table categories       enable row level security;
alter table recurring_rules  enable row level security;
alter table transactions     enable row level security;
alter table budgets          enable row level security;
alter table monthly_reports  enable row level security;

-- Users can only see their own data
create policy "own ledgers" on ledgers
  for all using (auth.uid() = user_id);

create policy "own categories" on categories
  for all using (auth.uid() = user_id or user_id is null);
  -- null = system defaults, readable by everyone

create policy "own transactions" on transactions
  for all using (
    ledger_id in (select id from ledgers where user_id = auth.uid())
  );

create policy "own budgets" on budgets
  for all using (auth.uid() = user_id);

create policy "own reports" on monthly_reports
  for all using (auth.uid() = user_id);

-- ──────────────────────────────────────
-- INDEXES (性能优化)
-- ──────────────────────────────────────
create index on transactions (ledger_id, txn_date desc);
create index on transactions (category_id);
create index on transactions (transfer_pair_id);
create index on recurring_rules (next_due) where is_active = true;
create index on monthly_reports (user_id, year, month);