-- AI explanations: tracks per-user Claude API calls so we can rate-limit
-- and audit usage. The actual generated text is *not* stored — every call
-- regenerates so the user always gets the freshest analysis.

create table if not exists ai_explanations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month integer not null,
  year integer not null,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  created_at timestamptz default now()
);

create index if not exists ai_explanations_user_created_idx
  on ai_explanations (user_id, created_at desc);

alter table ai_explanations enable row level security;

drop policy if exists "own ai explanations" on ai_explanations;
create policy "own ai explanations" on ai_explanations
  for all using (auth.uid() = user_id);
