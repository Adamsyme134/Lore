create or replace function public.add_friend_group_quest(
  target_group_id uuid,
  target_quest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.friend_groups
    where id = target_group_id
      and owner_id = auth.uid()
  ) and not exists (
    select 1
    from public.friend_group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  ) then
    raise exception 'You do not have access to this group.';
  end if;

  insert into public.friend_group_quests (group_id, quest_id, added_by)
  select target_group_id, target_quest_id, auth.uid()
  where not exists (
    select 1
    from public.friend_group_quests
    where group_id = target_group_id
      and quest_id = target_quest_id
  );
end;
$$;

grant execute on function public.add_friend_group_quest(uuid, uuid) to authenticated;

alter table public.quests
  add column if not exists auto_complete_quest_ids uuid[] not null default '{}';

alter table public.lore_entries
  add column if not exists auto_completed_quest_ids uuid[] not null default '{}';

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  visibility text not null default 'global' check (visibility in ('global', 'exclusive')),
  background_image_url text not null,
  image_position text default '50% 50%',
  icon_name text default 'trail-sign-outline',
  timeline jsonb not null default '[]'::jsonb,
  completed_count integer not null default 0,
  total_count integer not null default 0,
  next_quest_id uuid references public.quests(id) on delete set null,
  next_quest_title text not null default '',
  next_quest_image_url text not null default '',
  quest_ids uuid[] not null default '{}',
  public_quest_ids uuid[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journeys
  add column if not exists visibility text not null default 'global' check (visibility in ('global', 'exclusive'));

alter table public.journeys
  add column if not exists public_quest_ids uuid[] not null default '{}';

alter table public.journeys enable row level security;

drop policy if exists "Anyone can read active journeys" on public.journeys;
create policy "Anyone can read active journeys"
  on public.journeys
  for select
  using (is_active = true);

drop policy if exists "Authenticated users can manage journeys" on public.journeys;
create policy "Authenticated users can manage journeys"
  on public.journeys
  for all
  to authenticated
  using (true)
  with check (true);

create table if not exists public.user_journeys (
  user_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid not null references public.journeys(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'dismissed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, journey_id)
);

alter table public.user_journeys enable row level security;

drop policy if exists "Users can read own journey progress" on public.user_journeys;
create policy "Users can read own journey progress"
  on public.user_journeys
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage own journey progress" on public.user_journeys;
create policy "Users can manage own journey progress"
  on public.user_journeys
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
