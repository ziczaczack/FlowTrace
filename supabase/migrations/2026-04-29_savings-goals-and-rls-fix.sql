-- 2026-04-29: Add savings_goals table and patch missing recurring_rules RLS policy.
--
-- Run this in the Supabase SQL editor against your existing project. It is
-- idempotent: each statement is guarded with IF NOT EXISTS / safe drop+create
-- so it can be re-run without harm.

-- ──────────────────────────────────────
-- 1. recurring_rules — was missing an RLS policy. Without it, every read
--    and write fails silently because RLS was already enabled in schema.sql.
-- ──────────────────────────────────────
drop policy if exists "own recurring rules" on recurring_rules;
create policy "own recurring rules" on recurring_rules
  for all using (
    ledger_id in (select id from ledgers where user_id = auth.uid())
  );

-- ──────────────────────────────────────
-- 2. savings_goals — manual savings targets ("Japan trip RM 3,000 by Dec").
-- ──────────────────────────────────────
create table if not exists savings_goals (
  id              uuid           primary key default gen_random_uuid(),
  user_id         uuid           not null references auth.users(id) on delete cascade,
  name            text           not null,
  icon            text           default '🎯',
  color           text           default '#10b981',
  target_amount   numeric(12,2)  not null,
  current_amount  numeric(12,2)  default 0,
  target_date     date,
  is_active       boolean        default true,
  created_at      timestamptz    default now()
);

alter table savings_goals enable row level security;

drop policy if exists "own savings goals" on savings_goals;
create policy "own savings goals" on savings_goals
  for all using (auth.uid() = user_id);

create index if not exists savings_goals_user_active_idx
  on savings_goals (user_id, is_active);
