-- ─────────────────────────────────────────────────────────────────────────
-- Shared Ledgers — MVP scope (Tier B item B3)
-- Date: 2026-05-03
--
-- WHAT THIS DOES
--   Lets multiple users co-own a ledger. Members share read/write access
--   to `transactions` and `recurring_rules` only. Categories, budgets,
--   savings_goals, monthly_reports, ai_explanations all stay per-user
--   (intentional MVP scope — see CLAUDE/REPORT for why).
--
-- WHAT IT TOUCHES
--   + new table:    ledger_members
--   + new helpers:  is_ledger_member, can_write_ledger, is_ledger_owner
--   + new trigger:  ledgers_after_insert_membership (auto-owner row)
--   ~ rewrites RLS: ledgers, transactions, recurring_rules
--   ~ adds RLS:     categories (loosens SELECT for shared-ledger txns)
--
-- ROLLBACK
--   See the matching down migration at the bottom of this file (commented
--   out — uncomment to roll back). The forward migration is idempotent
--   (uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────

-- ─── 1. ledger_members table ─────────────────────────────────────────────
create table if not exists ledger_members (
  ledger_id  uuid not null references ledgers(id)        on delete cascade,
  user_id    uuid not null references auth.users(id)     on delete cascade,
  role       text not null default 'editor'
             check (role in ('owner', 'editor', 'viewer')),
  invited_by uuid references auth.users(id),
  joined_at  timestamptz not null default now(),
  primary key (ledger_id, user_id)
);

create index if not exists ledger_members_user_id_idx
  on ledger_members (user_id);

-- ─── 2. Backfill: every existing ledger gets its owner row ───────────────
insert into ledger_members (ledger_id, user_id, role, invited_by)
select id, user_id, 'owner', user_id from ledgers
on conflict (ledger_id, user_id) do nothing;

-- ─── 3. Helper functions (SECURITY DEFINER to avoid RLS recursion) ───────
create or replace function is_ledger_member(p_ledger_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from ledger_members
    where ledger_id = p_ledger_id
      and user_id   = p_user_id
  );
$$;

create or replace function can_write_ledger(p_ledger_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from ledger_members
    where ledger_id = p_ledger_id
      and user_id   = p_user_id
      and role      in ('owner', 'editor')
  );
$$;

create or replace function is_ledger_owner(p_ledger_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from ledger_members
    where ledger_id = p_ledger_id
      and user_id   = p_user_id
      and role      = 'owner'
  );
$$;

-- ─── 4. Trigger: auto-insert owner row when a new ledger is created ──────
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

drop trigger if exists ledgers_after_insert_membership on ledgers;
create trigger ledgers_after_insert_membership
  after insert on ledgers
  for each row
  execute function ensure_ledger_owner_membership();

-- ─── 5. RLS on ledger_members itself ─────────────────────────────────────
alter table ledger_members enable row level security;

drop policy if exists "members can read same-ledger members" on ledger_members;
create policy "members can read same-ledger members"
  on ledger_members for select
  using (is_ledger_member(ledger_id, auth.uid()));

drop policy if exists "owner can add members" on ledger_members;
create policy "owner can add members"
  on ledger_members for insert
  with check (is_ledger_owner(ledger_id, auth.uid()));

-- Owner can remove any member; any user can remove themselves (leave).
-- Owner cannot delete their own owner row directly — guarded at the API
-- layer (must transfer ownership first or delete the ledger).
drop policy if exists "owner can remove or self can leave" on ledger_members;
create policy "owner can remove or self can leave"
  on ledger_members for delete
  using (
    is_ledger_owner(ledger_id, auth.uid())
    or user_id = auth.uid()
  );

drop policy if exists "owner can change role" on ledger_members;
create policy "owner can change role"
  on ledger_members for update
  using      (is_ledger_owner(ledger_id, auth.uid()))
  with check (is_ledger_owner(ledger_id, auth.uid()));

-- ─── 6. Rewrite RLS on ledgers ───────────────────────────────────────────
drop policy if exists "own ledgers" on ledgers;

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

-- ─── 7. Rewrite RLS on transactions ──────────────────────────────────────
drop policy if exists "own transactions" on transactions;

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

-- ─── 8. Rewrite RLS on recurring_rules ───────────────────────────────────
drop policy if exists "own recurring rules" on recurring_rules;

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

-- ─── 9. Loosen categories SELECT so members can see foreign categories ──
-- A shared-ledger transaction may carry a category_id that belongs to
-- another member. Without this, the joined category resolves to null and
-- the UI loses the icon/color/name. This adds READ ONLY access — no write,
-- no insert, no update.
drop policy if exists "categories: visible via shared ledger txns" on categories;
create policy "categories: visible via shared ledger txns"
  on categories for select
  using (
    exists (
      select 1 from transactions t
      where t.category_id = categories.id
        and is_ledger_member(t.ledger_id, auth.uid())
    )
  );

-- ─── 10. Member management RPCs ────────────────────────────────────────
-- Return (user_id, email) for every member of a ledger. Caller must be a
-- member themselves. SECURITY DEFINER lets us read auth.users without
-- exposing it to PostgREST directly.
create or replace function get_ledger_member_emails(p_ledger_id uuid)
returns table (user_id uuid, email text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email::text, m.role, m.joined_at
  from ledger_members m
  join auth.users u on u.id = m.user_id
  where m.ledger_id = p_ledger_id
    and is_ledger_member(p_ledger_id, auth.uid())
  order by
    case m.role when 'owner' then 0 when 'editor' then 1 else 2 end,
    m.joined_at;
$$;

-- Invite by email. Only the ledger owner may invite. Returns the new
-- member row, or raises if the email isn't registered. Single round-trip
-- avoids a (lookup -> insert) race.
create or replace function invite_ledger_member(
  p_ledger_id uuid,
  p_email     text,
  p_role      text default 'editor'
) returns ledger_members
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id  uuid := auth.uid();
  invitee_id uuid;
  new_row    ledger_members;
begin
  if caller_id is null then
    raise exception 'unauthenticated';
  end if;
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

-- ─── DONE ────────────────────────────────────────────────────────────────
-- Verify with:
--   select count(*) from ledger_members;            -- should be >= ledgers count
--   select policyname from pg_policies where tablename in
--     ('ledgers','transactions','recurring_rules','ledger_members','categories');

-- ─────────────────────────────────────────────────────────────────────────
-- ROLLBACK (uncomment to undo)
-- ─────────────────────────────────────────────────────────────────────────
-- drop policy if exists "categories: visible via shared ledger txns" on categories;
-- drop policy if exists "recurring_rules: members can read"          on recurring_rules;
-- drop policy if exists "recurring_rules: editors can insert"        on recurring_rules;
-- drop policy if exists "recurring_rules: editors can update"        on recurring_rules;
-- drop policy if exists "recurring_rules: editors can delete"        on recurring_rules;
-- drop policy if exists "transactions: members can read"             on transactions;
-- drop policy if exists "transactions: editors can insert"           on transactions;
-- drop policy if exists "transactions: editors can update"           on transactions;
-- drop policy if exists "transactions: editors can delete"           on transactions;
-- drop policy if exists "ledgers: members can read"                  on ledgers;
-- drop policy if exists "ledgers: any auth user can create"          on ledgers;
-- drop policy if exists "ledgers: owner can update"                  on ledgers;
-- drop policy if exists "ledgers: owner can delete"                  on ledgers;
-- create policy "own ledgers" on ledgers for all using (auth.uid() = user_id);
-- create policy "own transactions" on transactions for all
--   using (ledger_id in (select id from ledgers where user_id = auth.uid()));
-- create policy "own recurring rules" on recurring_rules for all
--   using (ledger_id in (select id from ledgers where user_id = auth.uid()));
-- drop trigger if exists ledgers_after_insert_membership on ledgers;
-- drop function if exists invite_ledger_member(uuid, text, text);
-- drop function if exists get_ledger_member_emails(uuid);
-- drop function if exists ensure_ledger_owner_membership();
-- drop function if exists is_ledger_owner(uuid, uuid);
-- drop function if exists can_write_ledger(uuid, uuid);
-- drop function if exists is_ledger_member(uuid, uuid);
-- drop table if exists ledger_members;
