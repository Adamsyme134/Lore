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
