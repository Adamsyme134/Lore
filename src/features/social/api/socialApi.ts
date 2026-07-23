// src/features/social/api/socialApi.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";

import type { FriendMoment, Profile, Quest } from "../../../shared/types/domain";
import type { Accent } from "../../../shared/design/tokens";
import { mapQuest, type QuestRow } from "../../quests/api/questApi";

type FriendMomentRow = {
  id: string;
  title: string;
  location_name: string;
  cover_photo_url: string | null;
  profiles: {
    id: string;
    handle: string;
    full_name: string;
  } | null;
  quests: {
    accent: Accent;
  } | null;
};

type ProfileRow = {
  id: string;
  handle: string;
  full_name: string;
  avatar_url: string | null;
  home_city: string | null;
  points_total: number;
};

type FriendGroupRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

type FriendGroupMemberRow = {
  group_id: string;
  user_id: string;
};

type FriendGroupQuestRow = {
  group_id: string;
  quest_id: string;
};

export type LeaderboardFilter = "all_time" | "year" | "month";

export type FriendGroup = {
  id: string;
  ownerId: string;
  name: string;
  members: Profile[];
  quests: Quest[];
  createdAt: string;
};

export type FriendGroupLeaderboardEntry = Profile & {
  points: number;
};

export interface PendingRequest {
  id: string;
  requester: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string | null;
  };
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    handle: row.handle,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    homeCity: row.home_city,
    pointsTotal: row.points_total
  };
}

function formatSupabaseError(error: { message?: string; code?: string; details?: string; hint?: string }) {
  return [
    error.message,
    error.code ? `Code: ${error.code}` : null,
    error.details,
    error.hint
  ].filter(Boolean).join("\n");
}

async function fetchFriendMomentsFromSupabase(userId?: string) {
  const client = requireSupabase();
  let query = client
    .from("lore_entries")
    .select("id, title, location_name, cover_photo_url, profiles(id, handle, full_name), quests(accent)");

  if (userId) {
    query = query.neq("user_id", userId);
  }

  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .limit(12);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const item = row as unknown as FriendMomentRow;
    return {
      id: item.id,
      profileId: item.profiles?.id,
      name: item.profiles?.full_name ?? "A friend",
      handle: item.profiles?.handle,
      title: item.title,
      location: item.location_name,
      reaction: "This belongs in a proper field journal.",
      imageUrl: item.cover_photo_url ?? "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=85",
      accent: item.quests?.accent ?? "forest"
    } satisfies FriendMoment;
  });
}

export function useFriendMoments() {
  const { isBackendReady, user } = useAuth();

  return useQuery({
    queryKey: ["friend-moments", isBackendReady ? "remote" : "preview", user?.id],
    queryFn: () => (isBackendReady && user?.id ? fetchFriendMomentsFromSupabase(user.id) : Promise.resolve([])),
    enabled: !!user
  });
}

// ----------------------------------------------------
// NEW & UPDATED SEARCH / REQUEST APIS
// ----------------------------------------------------

export function useSearchUsers(searchQuery: string) {
  const { isBackendReady, user } = useAuth();
  
  return useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: async () => {
      if (!isBackendReady || !supabase || searchQuery.trim().length < 2) return [];
      const term = `%${searchQuery.trim()}%`;
      
      const client = requireSupabase();
      const { data, error } = await client
        .from("profiles")
        .select("id, handle, full_name, avatar_url, home_city, points_total")
        .or(`handle.ilike.${term},full_name.ilike.${term}`)
        .neq("id", user?.id)
        .limit(10);
        
      if (error) throw error;
      return (data as ProfileRow[]).map(mapProfile);
    },
    enabled: searchQuery.trim().length >= 2,
  });
}

export function useSendFriendRequest() {
  const { isBackendReady, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!isBackendReady || !user || !supabase) return;
      if (targetId === user.id) throw new Error("You cannot add yourself.");

      const client = requireSupabase();
      const { error } = await client.from("friend_requests").insert({
        requester_id: user.id,
        addressee_id: targetId,
        status: "pending"
      });

      if (error && error.code !== '23505') {
        // 23505 is unique violation, ignore if already requested
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    }
  });
}

export function usePendingRequests() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["pending-requests", user?.id],
    queryFn: async () => {
      if (!supabase || !user) return [];
      const { data, error } = await supabase
        .from("friend_requests")
        .select(`
          id,
          requester:profiles!friend_requests_requester_id_fkey(id, handle, full_name, avatar_url)
        `)
        .eq("addressee_id", user.id)
        .eq("status", "pending");
        
      if (error) throw error;
      
      return data.map((req: any) => ({
        id: req.id,
        requester: Array.isArray(req.requester) ? req.requester[0] : req.requester
      })) as PendingRequest[];
    },
    enabled: !!user && !!supabase,
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["friendsList"] });
    }
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase
        .from("friend_requests")
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pending-requests"] });
    }
  });
}

// ----------------------------------------------------
// FRIENDS LIST
// ----------------------------------------------------

export function useFriendsList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["friendsList", user?.id],
    queryFn: async () => {
      if (!supabase) throw new Error("Supabase is not initialized");
      if (!user) return [];

      const { data: friendships, error: friendError } = await supabase
        .from("friendships")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      if (friendError) throw friendError;
      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map(f => f.user_a === user.id ? f.user_b : f.user_a);

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, handle, avatar_url, home_city, points_total")
        .in("id", friendIds);

      if (profileError) throw profileError;

      return (profiles || []).map(mapProfile);
    },
    enabled: !!user && !!supabase,
  });
}

async function fetchFriendGroups(userId: string) {
  if (!supabase) return [];

  const ownedGroups = await supabase
    .from("friend_groups")
    .select("id, owner_id, name, created_at")
    .eq("owner_id", userId);

  const memberships = await supabase
    .from("friend_group_members")
    .select("group_id, user_id")
    .eq("user_id", userId);

  if (ownedGroups.error) throw ownedGroups.error;
  if (memberships.error) throw memberships.error;

  const groupIds = Array.from(new Set([
    ...(ownedGroups.data ?? []).map((group) => group.id),
    ...(memberships.data ?? []).map((membership) => membership.group_id)
  ]));

  if (groupIds.length === 0) return [];

  const [groupsResult, membersResult, groupQuestsResult] = await Promise.all([
    supabase
      .from("friend_groups")
      .select("id, owner_id, name, created_at")
      .in("id", groupIds),
    supabase
      .from("friend_group_members")
      .select("group_id, user_id")
      .in("group_id", groupIds),
    supabase
      .from("friend_group_quests")
      .select("group_id, quest_id")
      .in("group_id", groupIds)
  ]);

  if (groupsResult.error) throw groupsResult.error;
  if (membersResult.error) throw membersResult.error;
  if (groupQuestsResult.error) throw groupQuestsResult.error;

  const groups = (groupsResult.data ?? []) as FriendGroupRow[];
  const members = (membersResult.data ?? []) as FriendGroupMemberRow[];
  const groupQuests = (groupQuestsResult.data ?? []) as FriendGroupQuestRow[];
  const memberIds = Array.from(new Set(members.map((member) => member.user_id)));
  const questIds = Array.from(new Set(groupQuests.map((quest) => quest.quest_id)));

  const profilesResult = memberIds.length > 0
    ? await supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, home_city, points_total")
      .in("id", memberIds)
    : { data: [], error: null };

  if (profilesResult.error) throw profilesResult.error;

  const questsResult = questIds.length > 0
    ? await supabase
      .from("quests")
      .select("*")
      .in("id", questIds)
    : { data: [], error: null };

  if (questsResult.error) throw questsResult.error;

  const profilesById = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((profile) => [profile.id, mapProfile(profile)]));
  const questsById = new Map(((questsResult.data ?? []) as QuestRow[]).map((quest) => [quest.id, mapQuest(quest)]));

  return groups.map((group) => ({
    id: group.id,
    ownerId: group.owner_id,
    name: group.name,
    createdAt: group.created_at,
    members: members
      .filter((member) => member.group_id === group.id)
      .map((member) => profilesById.get(member.user_id))
      .filter((member): member is Profile => !!member),
    quests: groupQuests
      .filter((quest) => quest.group_id === group.id)
      .map((quest) => questsById.get(quest.quest_id))
      .filter((quest): quest is Quest => !!quest)
  } satisfies FriendGroup));
}

export function useFriendGroups() {
  const { user, isBackendReady } = useAuth();

  return useQuery({
    queryKey: ["friend-groups", user?.id],
    queryFn: () => (isBackendReady && user?.id ? fetchFriendGroups(user.id) : Promise.resolve([])),
    enabled: !!user
  });
}

export function useCreateFriendGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, memberIds }: { name: string; memberIds: string[] }) => {
      if (!user) throw new Error("Sign in before creating a group.");
      const client = requireSupabase();

      const { data: group, error: groupError } = await client
        .from("friend_groups")
        .insert({ owner_id: user.id, name: name.trim() || "New circle" })
        .select("id")
        .single();

      if (groupError) throw new Error(formatSupabaseError(groupError));

      const uniqueMemberIds = Array.from(new Set([user.id, ...memberIds]));
      const { error: membersError } = await client
        .from("friend_group_members")
        .insert(uniqueMemberIds.map((memberId) => ({
          group_id: group.id,
          user_id: memberId,
          added_by: user.id
        })));

      if (membersError) throw new Error(formatSupabaseError(membersError));
      return group.id as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

export function useRenameFriendGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, name }: { groupId: string; name: string }) => {
      if (!user) throw new Error("Sign in before renaming a group.");
      const client = requireSupabase();
      const { error } = await client
        .from("friend_groups")
        .update({ name: name.trim() || "Untitled circle" })
        .eq("id", groupId)
        .eq("owner_id", user.id);

      if (error) throw new Error(formatSupabaseError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

export function useAddFriendGroupMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      if (!user) throw new Error("Sign in before adding a member.");
      const client = requireSupabase();
      const { error } = await client
        .from("friend_group_members")
        .insert({ group_id: groupId, user_id: userId, added_by: user.id });

      if (error && error.code !== "23505") throw new Error(formatSupabaseError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

export function useRemoveFriendGroupMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const client = requireSupabase();
      const { error } = await client
        .from("friend_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw new Error(formatSupabaseError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

export function useAddFriendGroupQuest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, questId }: { groupId: string; questId: string }) => {
      if (!user) throw new Error("Sign in before adding a quest.");
      const client = requireSupabase();
      const { error } = await client
        .from("friend_group_quests")
        .insert({ group_id: groupId, quest_id: questId, added_by: user.id });

      if (error && error.code !== "23505") throw new Error(formatSupabaseError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

export function useRemoveFriendGroupQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, questId }: { groupId: string; questId: string }) => {
      const client = requireSupabase();
      const { error } = await client
        .from("friend_group_quests")
        .delete()
        .eq("group_id", groupId)
        .eq("quest_id", questId);

      if (error) throw new Error(formatSupabaseError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

function getLeaderboardStart(filter: LeaderboardFilter) {
  const now = new Date();

  if (filter === "year") {
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }

  if (filter === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  return null;
}

export function useFriendGroupLeaderboard(group?: FriendGroup, filter: LeaderboardFilter = "all_time") {
  const memberIds = group?.members.map((member) => member.id) ?? [];
  const start = getLeaderboardStart(filter);

  return useQuery({
    queryKey: ["friend-group-leaderboard", group?.id, filter, memberIds.join(",")],
    queryFn: async () => {
      if (!group) return [];

      if (filter === "all_time" || !supabase) {
        return [...group.members]
          .map((member) => ({ ...member, points: member.pointsTotal }))
          .sort((a, b) => b.points - a.points);
      }

      if (memberIds.length === 0) return [];

      const query = supabase
        .from("lore_entries")
        .select("user_id, points_awarded, occurred_at")
        .in("user_id", memberIds);

      const { data, error } = start
        ? await query.gte("occurred_at", start)
        : await query;

      if (error) throw error;

      const pointsByUser = new Map(memberIds.map((memberId) => [memberId, 0]));
      (data ?? []).forEach((entry: any) => {
        pointsByUser.set(entry.user_id, (pointsByUser.get(entry.user_id) ?? 0) + (entry.points_awarded ?? 0));
      });

      return group.members
        .map((member) => ({ ...member, points: pointsByUser.get(member.id) ?? 0 }))
        .sort((a, b) => b.points - a.points);
    },
    enabled: !!group
  });
}
