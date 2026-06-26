-- Lore V1 Supabase schema
-- Run this in the Supabase SQL editor before launching the real backend build.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle = lower(handle) and handle ~ '^[a-z0-9_]{3,24}$'),
  full_name text not null,
  avatar_url text,
  home_city text,
  points_total integer not null default 0 check (points_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kicker text not null,
  description text not null,
  why_it_matters text not null,
  location_hint text not null,
  duration_label text not null,
  mood text not null check (mood in ('quiet', 'social', 'curious', 'wild', 'creative')),
  accent text not null check (accent in ('forest', 'navy', 'orange', 'burgundy', 'gold')),
  image_url text not null,
  steps text[] not null default '{}',
  journal_prompt text not null,
  points_value integer not null default 10 check (points_value between 1 and 25),
  is_curated boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  status text not null check (status in ('saved', 'active', 'completed', 'dismissed')),
  invited_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quest_id)
);

create table if not exists public.lore_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid references public.quests(id) on delete set null,
  title text not null,
  journal text not null,
  location_name text not null,
  latitude double precision,
  longitude double precision,
  mood text not null,
  occurred_at timestamptz not null default now(),
  cover_photo_url text,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lore_photos (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a <> user_b),
  unique (user_a, user_b)
);

create table if not exists public.quest_invites (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> receiver_id),
  unique (quest_id, sender_id, receiver_id)
);

create table if not exists public.entry_reactions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('beautiful', 'want_to_try', 'brave', 'quietly_jealous', 'made_me_go_outside')),
  created_at timestamptz not null default now(),
  unique (entry_id, user_id, reaction)
);

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_id uuid references public.lore_entries(id) on delete set null,
  reason text not null check (reason in ('quest_completed', 'photo_added', 'shared_completion', 'manual_adjustment')),
  points integer not null check (points > 0 and points <= 50),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists quests_active_created_idx on public.quests (is_active, created_at desc);
create index if not exists lore_entries_user_occurred_idx on public.lore_entries (user_id, occurred_at desc);
create index if not exists lore_entries_location_idx on public.lore_entries (latitude, longitude);
create index if not exists lore_photos_entry_idx on public.lore_photos (entry_id, sort_order);
create index if not exists friend_requests_addressee_idx on public.friend_requests (addressee_id, status);
create index if not exists friendships_user_a_idx on public.friendships (user_a);
create index if not exists friendships_user_b_idx on public.friendships (user_b);
create index if not exists points_ledger_user_idx on public.points_ledger (user_id, created_at desc);
create unique index if not exists points_ledger_user_entry_reason_idx on public.points_ledger (user_id, entry_id, reason) where entry_id is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists quests_touch_updated_at on public.quests;
create trigger quests_touch_updated_at
before update on public.quests
for each row execute function public.touch_updated_at();

drop trigger if exists user_quests_touch_updated_at on public.user_quests;
create trigger user_quests_touch_updated_at
before update on public.user_quests
for each row execute function public.touch_updated_at();

drop trigger if exists lore_entries_touch_updated_at on public.lore_entries;
create trigger lore_entries_touch_updated_at
before update on public.lore_entries
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_handle text;
  safe_handle text;
begin
  raw_handle := coalesce(new.raw_user_meta_data ->> 'handle', split_part(new.email, '@', 1), 'user');
  safe_handle := lower(regexp_replace(raw_handle, '[^a-zA-Z0-9_]', '', 'g'));

  if char_length(safe_handle) < 3 then
    safe_handle := 'user_' || substring(new.id::text from 1 for 6);
  end if;

  insert into public.profiles (id, handle, full_name)
  values (
    new.id,
    safe_handle,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New explorer')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.apply_points_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set points_total = points_total + new.points
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists points_ledger_apply_total on public.points_ledger;
create trigger points_ledger_apply_total
after insert on public.points_ledger
for each row execute function public.apply_points_total();

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where (f.user_a = a and f.user_b = b)
       or (f.user_a = b and f.user_b = a)
  );
$$;

create or replace function public.accept_friend_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.friend_requests%rowtype;
  first_user uuid;
  second_user uuid;
begin
  select * into request_record
  from public.friend_requests
  where id = request_id
    and addressee_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Friend request not found';
  end if;

  if request_record.requester_id::text < request_record.addressee_id::text then
    first_user := request_record.requester_id;
    second_user := request_record.addressee_id;
  else
    first_user := request_record.addressee_id;
    second_user := request_record.requester_id;
  end if;

  update public.friend_requests
  set status = 'accepted', responded_at = now()
  where id = request_id;

  insert into public.friendships (user_a, user_b)
  values (first_user, second_user)
  on conflict do nothing;
end;
$$;

create or replace function public.award_lore_points(entry_id uuid, photo_count integer default 0)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_record public.lore_entries%rowtype;
  quest_points integer;
  awarded integer;
begin
  select * into entry_record
  from public.lore_entries
  where id = entry_id;

  if not found then
    raise exception 'Lore entry not found';
  end if;

  if entry_record.user_id <> auth.uid() then
    raise exception 'Cannot award points for another user';
  end if;

  select coalesce(points_value, 10) into quest_points
  from public.quests
  where id = entry_record.quest_id;

  awarded := coalesce(quest_points, 10) + least(greatest(coalesce(photo_count, 0), 0), 3) * 2;

  insert into public.points_ledger (user_id, entry_id, reason, points, metadata)
  values (
    auth.uid(),
    entry_id,
    'quest_completed',
    awarded,
    jsonb_build_object('photo_count', coalesce(photo_count, 0), 'quest_id', entry_record.quest_id)
  )
  on conflict do nothing;

  return awarded;
end;
$$;

drop policy if exists "profiles are visible to authenticated users" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "active quests are visible" on public.quests;
drop policy if exists "users read own quest states" on public.user_quests;
drop policy if exists "users insert own quest states" on public.user_quests;
drop policy if exists "users update own quest states" on public.user_quests;
drop policy if exists "users and friends read lore entries" on public.lore_entries;
drop policy if exists "users insert own lore entries" on public.lore_entries;
drop policy if exists "users update own lore entries" on public.lore_entries;
drop policy if exists "users delete own lore entries" on public.lore_entries;
drop policy if exists "users and friends read lore photos" on public.lore_photos;
drop policy if exists "users insert own lore photos" on public.lore_photos;
drop policy if exists "users see related friend requests" on public.friend_requests;
drop policy if exists "users create outgoing friend requests" on public.friend_requests;
drop policy if exists "request addressee can update request" on public.friend_requests;
drop policy if exists "users see own friendships" on public.friendships;
drop policy if exists "users see related quest invites" on public.quest_invites;
drop policy if exists "users invite friends to quests" on public.quest_invites;
drop policy if exists "receiver updates quest invite" on public.quest_invites;
drop policy if exists "users and friends read reactions" on public.entry_reactions;
drop policy if exists "users react to visible entries" on public.entry_reactions;
drop policy if exists "users read own points" on public.points_ledger;
drop policy if exists "lore photos are readable" on storage.objects;
drop policy if exists "users upload own lore photos" on storage.objects;
drop policy if exists "users update own lore photos" on storage.objects;
drop policy if exists "users delete own lore photos" on storage.objects;

alter table public.profiles enable row level security;
alter table public.quests enable row level security;
alter table public.user_quests enable row level security;
alter table public.lore_entries enable row level security;
alter table public.lore_photos enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.quest_invites enable row level security;
alter table public.entry_reactions enable row level security;
alter table public.points_ledger enable row level security;

create policy "profiles are visible to authenticated users" on public.profiles
for select to authenticated using (true);

create policy "users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "active quests are visible" on public.quests
for select to authenticated using (is_active = true);

create policy "users read own quest states" on public.user_quests
for select to authenticated using (user_id = auth.uid());

create policy "users insert own quest states" on public.user_quests
for insert to authenticated with check (user_id = auth.uid());

create policy "users update own quest states" on public.user_quests
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users and friends read lore entries" on public.lore_entries
for select to authenticated using (user_id = auth.uid() or public.are_friends(user_id, auth.uid()));

create policy "users insert own lore entries" on public.lore_entries
for insert to authenticated with check (user_id = auth.uid());

create policy "users update own lore entries" on public.lore_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users delete own lore entries" on public.lore_entries
for delete to authenticated using (user_id = auth.uid());

create policy "users and friends read lore photos" on public.lore_photos
for select to authenticated using (
  exists (
    select 1 from public.lore_entries e
    where e.id = lore_photos.entry_id
      and (e.user_id = auth.uid() or public.are_friends(e.user_id, auth.uid()))
  )
);

create policy "users insert own lore photos" on public.lore_photos
for insert to authenticated with check (user_id = auth.uid());

create policy "users see related friend requests" on public.friend_requests
for select to authenticated using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users create outgoing friend requests" on public.friend_requests
for insert to authenticated with check (requester_id = auth.uid());

create policy "request addressee can update request" on public.friend_requests
for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

create policy "users see own friendships" on public.friendships
for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

create policy "users see related quest invites" on public.quest_invites
for select to authenticated using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "users invite friends to quests" on public.quest_invites
for insert to authenticated with check (sender_id = auth.uid() and public.are_friends(sender_id, receiver_id));

create policy "receiver updates quest invite" on public.quest_invites
for update to authenticated using (receiver_id = auth.uid()) with check (receiver_id = auth.uid());

create policy "users and friends read reactions" on public.entry_reactions
for select to authenticated using (
  exists (
    select 1 from public.lore_entries e
    where e.id = entry_reactions.entry_id
      and (e.user_id = auth.uid() or public.are_friends(e.user_id, auth.uid()))
  )
);

create policy "users react to visible entries" on public.entry_reactions
for insert to authenticated with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lore_entries e
    where e.id = entry_reactions.entry_id
      and (e.user_id = auth.uid() or public.are_friends(e.user_id, auth.uid()))
  )
);

create policy "users read own points" on public.points_ledger
for select to authenticated using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lore-photos', 'lore-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "lore photos are readable" on storage.objects
for select to authenticated using (bucket_id = 'lore-photos');

create policy "users upload own lore photos" on storage.objects
for insert to authenticated with check (
  bucket_id = 'lore-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users update own lore photos" on storage.objects
for update to authenticated using (
  bucket_id = 'lore-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users delete own lore photos" on storage.objects
for delete to authenticated using (
  bucket_id = 'lore-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
