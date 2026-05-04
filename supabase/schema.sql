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
  -- user_id: original creator. Kept for back-compat. Authoritative
  -- ownership/membership lives in ledger_members.
  name         text        not null,
  type         text        not null default 'personal',
  -- type: 'personal' | 'investment' | 'business'
  currency     text        not null default 'MYR',
  icon         text        default '💼',
  is_default   boolean     default false,
  created_at   timestamptz default now()
);

-- ──────────────────────────────────────
-- 1a. LEDGER MEMBERS (multi-user access)
-- ──────────────────────────────────────
create table ledger_members (
  ledger_id  uuid not null references ledgers(id)        on delete cascade,
  user_id    uuid not null references auth.users(id)     on delete cascade,
  role       text not null default 'editor'
             check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users(id),
  joined_at  timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

create index ledger_members_user_id_idx on ledger_members (user_id);

-- Auto-insert owner row when a new ledger is created.
create or replace function ensure_ledger_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into ledger_members (ledger_id, user_id, role, invited_by)
  values (NEW.id, NEW.user_id, 'owner', NEW.user_id)
  on conflict (ledger_id, user_id) do nothing;
  return NEW;
end;
$$;

create trigger ledgers_after_insert_membership
  after insert on ledgers
  for each row
  execute function ensure_ledger_owner_membership();

-- Membership-check helpers (SECURITY DEFINER avoids RLS recursion).
create or replace function is_ledger_member(p_ledger_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from ledger_members
    where ledger_id = p_ledger_id and user_id = p_user_id
  );
$$;

create or replace function can_write_ledger(p_ledger_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from ledger_members
    where ledger_id = p_ledger_id and user_id = p_user_id
      and role in ('owner', 'editor')
  );
$$;

create or replace function is_ledger_owner(p_ledger_id uuid, p_user_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from ledger_members
    where ledger_id = p_ledger_id and user_id = p_user_id and role = 'owner'
  );
$$;

-- Read all members of a ledger (incl. their email). Caller must be a member.
create or replace function get_ledger_member_emails(p_ledger_id uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, u.email::text, m.role, m.joined_at
  from ledger_members m
  join auth.users u on u.id = m.user_id
  where m.ledger_id = p_ledger_id
    and is_ledger_member(p_ledger_id, auth.uid())
  order by
    case m.role when 'owner' then 0 when 'editor' then 1 else 2 end,
    m.joined_at;
$$;

-- Invite by email. Only the owner may invite.
create or replace function invite_ledger_member(
  p_ledger_id uuid,
  p_email     text,
  p_role      text default 'editor'
) returns ledger_members
language plpgsql security definer set search_path = public as $$
declare
  caller_id  uuid := auth.uid();
  invitee_id uuid;
  new_row    ledger_members;
begin
  if caller_id is null then raise exception 'unauthenticated'; end if;
  if not is_ledger_owner(p_ledger_id, caller_id) then
    raise exception 'only the ledger owner can invite members';
  end if;
  if p_role not in ('owner', 'editor', 'viewer') then
    raise exception 'invalid role: %', p_role;
  end if;
  select id into invitee_id from auth.users where lower(email) = lower(p_email);
  if invitee_id is null then
    raise exception 'no user with that email is registered';
  end if;
  if invitee_id = caller_id then
    raise exception 'you are already a member of this ledger';
  end if;
  insert into ledger_members (ledger_id, user_id, role, invited_by)
  values (p_ledger_id, invitee_id, p_role, caller_id)
  on conflict (ledger_id, user_id) do update
    set role = excluded.role
  returning * into new_row;
  return new_row;
end;
$$;

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
-- 6. SAVINGS GOALS (储蓄目标)
-- ──────────────────────────────────────
create table savings_goals (
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

-- ──────────────────────────────────────
-- 7. MONTHLY REPORTS (月度报告缓存)
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
alter table ledger_members   enable row level security;
alter table categories       enable row level security;
alter table recurring_rules  enable row level security;
alter table transactions     enable row level security;
alter table budgets          enable row level security;
alter table savings_goals    enable row level security;
alter table monthly_reports  enable row level security;

-- Ledgers — members read, owner writes.
create policy "ledgers: members can read"
  on ledgers for select
  using (is_ledger_member(id, auth.uid()));

create policy "ledgers: any auth user can create"
  on ledgers for insert
  with check (auth.uid() = user_id);

create policy "ledgers: owner can update"
  on ledgers for update
  using      (is_ledger_owner(id, auth.uid()))
  with check (is_ledger_owner(id, auth.uid()));

create policy "ledgers: owner can delete"
  on ledgers for delete
  using (is_ledger_owner(id, auth.uid()));

-- ledger_members — members read, owner writes (any user can leave).
create policy "members can read same-ledger members"
  on ledger_members for select
  using (is_ledger_member(ledger_id, auth.uid()));

create policy "owner can add members"
  on ledger_members for insert
  with check (is_ledger_owner(ledger_id, auth.uid()));

create policy "owner can remove or self can leave"
  on ledger_members for delete
  using (is_ledger_owner(ledger_id, auth.uid()) or user_id = auth.uid());

create policy "owner can change role"
  on ledger_members for update
  using      (is_ledger_owner(ledger_id, auth.uid()))
  with check (is_ledger_owner(ledger_id, auth.uid()));

-- Categories — own + system defaults, plus read access to categories used
-- in transactions of any ledger this user is a member of.
create policy "own categories" on categories
  for all using (auth.uid() = user_id or user_id is null);

create policy "categories: visible via shared ledger txns"
  on categories for select
  using (
    exists (
      select 1 from transactions t
      where t.category_id = categories.id
        and is_ledger_member(t.ledger_id, auth.uid())
    )
  );

-- Transactions — members read, editors+ write.
create policy "transactions: members can read"
  on transactions for select
  using (is_ledger_member(ledger_id, auth.uid()));

create policy "transactions: editors can insert"
  on transactions for insert
  with check (can_write_ledger(ledger_id, auth.uid()));

create policy "transactions: editors can update"
  on transactions for update
  using      (can_write_ledger(ledger_id, auth.uid()))
  with check (can_write_ledger(ledger_id, auth.uid()));

create policy "transactions: editors can delete"
  on transactions for delete
  using (can_write_ledger(ledger_id, auth.uid()));

-- Recurring rules — members read, editors+ write.
create policy "recurring_rules: members can read"
  on recurring_rules for select
  using (is_ledger_member(ledger_id, auth.uid()));

create policy "recurring_rules: editors can insert"
  on recurring_rules for insert
  with check (can_write_ledger(ledger_id, auth.uid()));

create policy "recurring_rules: editors can update"
  on recurring_rules for update
  using      (can_write_ledger(ledger_id, auth.uid()))
  with check (can_write_ledger(ledger_id, auth.uid()));

create policy "recurring_rules: editors can delete"
  on recurring_rules for delete
  using (can_write_ledger(ledger_id, auth.uid()));

-- Budgets, savings goals, reports stay per-user.
create policy "own budgets" on budgets
  for all using (auth.uid() = user_id);

create policy "own savings goals" on savings_goals
  for all using (auth.uid() = user_id);

create policy "own reports" on monthly_reports
  for all using (auth.uid() = user_id);

-- ──────────────────────────────────────
-- 9. AI EXPLANATIONS (Claude usage log + rate limit)
-- ──────────────────────────────────────
create table ai_explanations (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  month             integer     not null,
  year              integer     not null,
  input_tokens      integer,
  output_tokens     integer,
  cache_read_tokens integer,
  created_at        timestamptz default now()
);

alter table ai_explanations enable row level security;

create policy "own ai explanations" on ai_explanations
  for all using (auth.uid() = user_id);

-- ──────────────────────────────────────
-- INDEXES (性能优化)
-- ──────────────────────────────────────
create index on transactions (ledger_id, txn_date desc);
create index on transactions (category_id);
create index on transactions (transfer_pair_id);
create index on recurring_rules (next_due) where is_active = true;
create index on savings_goals (user_id, is_active);
create index on monthly_reports (user_id, year, month);
create index on ai_explanations (user_id, created_at desc);