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
  color_scheme_id text not null default 'forest' check (color_scheme_id in ('forest', 'ocean', 'terracotta', 'sandstone', 'slate', 'plum')),
  timeline jsonb not null default '[]'::jsonb,
  completed_count integer not null default 0,
  total_count integer not null default 0,
  next_quest_id uuid references public.quests(id) on delete set null,
  next_quest_title text not null default '',
  next_quest_image_url text not null default '',
  quest_ids uuid[] not null default '{}',
  public_quest_ids uuid[] not null default '{}',
  tree_nodes jsonb not null default '[]'::jsonb,
  tree_edges jsonb not null default '[]'::jsonb,
  requirement_sets jsonb not null default '[]'::jsonb,
  capability_unlocks jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journeys
  add column if not exists visibility text not null default 'global' check (visibility in ('global', 'exclusive'));

alter table public.journeys
  add column if not exists public_quest_ids uuid[] not null default '{}';

alter table public.journeys
  add column if not exists color_scheme_id text not null default 'forest';

alter table public.journeys
  drop constraint if exists journeys_color_scheme_id_check;

alter table public.journeys
  add constraint journeys_color_scheme_id_check
  check (color_scheme_id in ('forest', 'ocean', 'terracotta', 'sandstone', 'slate', 'plum'));

alter table public.journeys
  add column if not exists tree_nodes jsonb not null default '[]'::jsonb,
  add column if not exists tree_edges jsonb not null default '[]'::jsonb,
  add column if not exists requirement_sets jsonb not null default '[]'::jsonb,
  add column if not exists capability_unlocks jsonb not null default '[]'::jsonb;

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

create table if not exists public.quest_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  cover_image_url text not null,
  image_position text default '50% 50%',
  icon_name text default 'albums-outline',
  quest_ids uuid[] not null default '{}',
  unlock_quest_ids uuid[] not null default '{}',
  always_unlocked boolean not null default true,
  unlocked_by_kind text check (unlocked_by_kind in ('quest', 'collection')),
  unlocked_by_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quest_collections_unlock_source_check
    check (
      always_unlocked = true
      or (unlocked_by_kind is not null and unlocked_by_id is not null)
    )
);

alter table public.quest_collections
  add column if not exists description text not null default '',
  add column if not exists cover_image_url text,
  add column if not exists image_position text default '50% 50%',
  add column if not exists icon_name text default 'albums-outline',
  add column if not exists quest_ids uuid[] not null default '{}',
  add column if not exists unlock_quest_ids uuid[] not null default '{}',
  add column if not exists always_unlocked boolean not null default true,
  add column if not exists unlocked_by_kind text,
  add column if not exists unlocked_by_id uuid,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.quest_collections
set cover_image_url = 'https://images.unsplash.com/photo-1445308394109-4ec2920981b1?auto=format&fit=crop&w=1200&q=85'
where cover_image_url is null or cover_image_url = '';

alter table public.quest_collections
  alter column cover_image_url set not null;

alter table public.quest_collections
  drop constraint if exists quest_collections_unlocked_by_kind_check;

alter table public.quest_collections
  add constraint quest_collections_unlocked_by_kind_check
  check (unlocked_by_kind is null or unlocked_by_kind in ('quest', 'collection'));

alter table public.quest_collections
  drop constraint if exists quest_collections_unlock_source_check;

alter table public.quest_collections
  add constraint quest_collections_unlock_source_check
  check (
    always_unlocked = true
    or (unlocked_by_kind is not null and unlocked_by_id is not null)
  );

create index if not exists quest_collections_active_created_idx
  on public.quest_collections (is_active, created_at desc);

alter table public.quest_collections enable row level security;

drop policy if exists "Anyone can read active quest collections" on public.quest_collections;
create policy "Anyone can read active quest collections"
  on public.quest_collections
  for select
  using (is_active = true);

drop policy if exists "Authenticated users can manage quest collections" on public.quest_collections;
create policy "Authenticated users can manage quest collections"
  on public.quest_collections
  for all
  to authenticated
  using (true)
  with check (true);

do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles
      add column if not exists country text,
      add column if not exists allow_abroad boolean not null default false,
      add column if not exists preferred_categories text[] not null default '{}',
      add column if not exists preferred_moods text[] not null default '{}',
      add column if not exists max_difficulty text,
      add column if not exists max_cost text;
  end if;
end;
$$;

create table if not exists public.user_quest_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'viewed',
      'clicked',
      'saved',
      'started',
      'completed',
      'completed_similar_journey',
      'completed_similar_collection'
    )
  ),
  weight numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_quest_events_user_created_idx
  on public.user_quest_events (user_id, created_at desc);

create index if not exists user_quest_events_user_quest_idx
  on public.user_quest_events (user_id, quest_id);

create index if not exists user_quest_events_quest_type_idx
  on public.user_quest_events (quest_id, event_type);

alter table public.user_quest_events enable row level security;

drop policy if exists "Users can read own quest events" on public.user_quest_events;
create policy "Users can read own quest events"
  on public.user_quest_events
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own quest events" on public.user_quest_events;
create policy "Users can insert own quest events"
  on public.user_quest_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create or replace function public.record_user_quest_event(
  quest_id_param uuid,
  event_type_param text,
  metadata_param jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  event_weight numeric;
begin
  event_weight := case event_type_param
    when 'viewed' then 1
    when 'clicked' then 2
    when 'saved' then 4
    when 'started' then 6
    when 'completed' then 10
    when 'completed_similar_journey' then 12
    when 'completed_similar_collection' then 12
    else null
  end;

  if event_weight is null then
    raise exception 'Unknown quest event type: %', event_type_param;
  end if;

  insert into public.user_quest_events (user_id, quest_id, event_type, weight, metadata)
  values (auth.uid(), quest_id_param, event_type_param, event_weight, metadata_param);
end;
$$;

grant execute on function public.record_user_quest_event(uuid, text, jsonb) to authenticated;

create or replace view public.v_user_quest_affinity as
select
  user_id,
  quest_id,
  count(*) filter (where event_type = 'viewed') as viewed_count,
  count(*) filter (where event_type = 'clicked') as clicked_count,
  count(*) filter (where event_type = 'saved') as saved_count,
  count(*) filter (where event_type = 'started') as started_count,
  count(*) filter (where event_type = 'completed') as completed_count,
  sum(weight) as affinity_score,
  max(created_at) as last_event_at
from public.user_quest_events
group by user_id, quest_id;

create or replace view public.v_quests_with_stats as
select
  q.*,
  coalesce(views.view_count, 0)::integer as view_count,
  coalesce(active.active_count, 0)::integer as active_count,
  coalesce(done.completed_count, 0)::integer as completed_count,
  '{}'::text[] as recent_avatars
from public.quests q
left join (
  select quest_id, count(*) as view_count
  from public.user_quest_events
  where event_type = 'viewed'
  group by quest_id
) views on views.quest_id = q.id
left join (
  select quest_id, count(*) as active_count
  from public.user_quests
  where status = 'active'
  group by quest_id
) active on active.quest_id = q.id
left join (
  select quest_id, count(*) as completed_count
  from public.user_quests
  where status = 'completed'
  group by quest_id
) done on done.quest_id = q.id;
