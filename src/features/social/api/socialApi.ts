// src/features/social/api/socialApi.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";

import type { FriendMoment, Profile, Quest } from "../../../shared/types/domain";
import type { Accent } from "../../../shared/design/tokens";
import { mapQuest, type QuestRow } from "../../quests/api/questApi";

type FriendMomentRow = {
  id: string;
  quest_id: string | null;
  title: string;
  journal: string;
  location_name: string;
  cover_photo_url: string | null;
  profiles: {
    id: string;
    handle: string;
    full_name: string;
    avatar_url: string | null;
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
  banner_image_url?: string | null;
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

type FriendGroupLeaderboardPointRow = {
  user_id: string;
  points: number;
};

type UserQuestRow = {
  quest_id: string;
  completed_step_indexes: number[] | null;
  quests: QuestRow | null;
};

type FriendshipRow = {
  user_a: string;
  user_b: string;
};

type AcceptedFriendRequestRow = {
  requester_id: string;
  addressee_id: string;
};

export type LeaderboardFilter = "all_time" | "year" | "month";

export type FriendGroup = {
  id: string;
  ownerId: string;
  name: string;
  bannerImageUrl?: string | null;
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

export type LoreComment = {
  id: string;
  entryId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string | null;
  };
};

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

function isMissingEngagementTable(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.toLowerCase().includes("does not exist");
}

function countByEntryId(rows: Array<{ entry_id: string }> | null | undefined) {
  return (rows ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.entry_id] = (acc[row.entry_id] ?? 0) + 1;
    return acc;
  }, {});
}

async function fetchFriendMomentEngagement(entryIds: string[], userId?: string) {
  if (entryIds.length === 0) {
    return { likeCounts: {}, commentCounts: {}, likedEntryIds: new Set<string>() };
  }

  const client = requireSupabase();
  const [likesResult, commentsResult] = await Promise.all([
    client.from("lore_likes").select("entry_id, user_id").in("entry_id", entryIds),
    client.from("lore_comments").select("entry_id").in("entry_id", entryIds)
  ]);

  const likeCounts = likesResult.error && isMissingEngagementTable(likesResult.error)
    ? {}
    : countByEntryId(likesResult.data as Array<{ entry_id: string }> | null);
  const commentCounts = commentsResult.error && isMissingEngagementTable(commentsResult.error)
    ? {}
    : countByEntryId(commentsResult.data as Array<{ entry_id: string }> | null);

  if (likesResult.error || commentsResult.error) {
    console.warn("Friend lore engagement is unavailable; rendering moments without counts.", likesResult.error ?? commentsResult.error);
  }

  const likedEntryIds = new Set(
    (likesResult.error ? [] : ((likesResult.data as Array<{ entry_id: string; user_id: string }> | null) ?? []))
      .filter((like) => like.user_id === userId)
      .map((like) => like.entry_id)
  );

  return { likeCounts, commentCounts, likedEntryIds };
}

function uniqueFriendIds(ids: string[], userId: string) {
  return Array.from(new Set(ids.filter((id) => id && id !== userId)));
}

async function fetchFriendIdsFromSupabase(userId: string) {
  const client = requireSupabase();
  let hadLookupError = false;

  const { data: friendships, error: friendshipError } = await client
    .from("friendships")
    .select("user_a, user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (friendshipError) {
    hadLookupError = true;
    console.warn("Friendship lookup failed while loading friend lore.", friendshipError);
  } else {
    const friendIds = uniqueFriendIds(
      ((friendships ?? []) as FriendshipRow[]).map((friendship) => (
        friendship.user_a === userId ? friendship.user_b : friendship.user_a
      )),
      userId
    );

    if (friendIds.length > 0) {
      return friendIds;
    }
  }

  const { data: acceptedRequests, error: requestError } = await client
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (requestError) {
    hadLookupError = true;
    console.warn("Accepted friend request lookup failed while loading friend lore.", requestError);
  } else {
    return uniqueFriendIds(
      ((acceptedRequests ?? []) as AcceptedFriendRequestRow[]).map((request) => (
        request.requester_id === userId ? request.addressee_id : request.requester_id
      )),
      userId
    );
  }

  return hadLookupError ? null : [];
}

async function uploadFriendGroupBanner(
  userId: string,
  groupId: string,
  asset: { uri: string; mimeType?: string | null }
) {
  const client = requireSupabase();
  const extension = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const contentType = asset.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`;
  const storagePath = `${userId}/friend-groups/${groupId}/${Date.now()}.${extension}`;
  const arrayBuffer = await fetch(asset.uri).then((response) => response.arrayBuffer());

  const { error } = await client.storage
    .from("lore-photos")
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false
    });

  if (error) throw error;

  const { data } = client.storage.from("lore-photos").getPublicUrl(storagePath);
  return data.publicUrl;
}

async function fetchFriendMomentsFromSupabase(userId?: string) {
  const client = requireSupabase();
  let friendIds: string[] | null = null;

  if (userId) {
    friendIds = await fetchFriendIdsFromSupabase(userId);

    if (friendIds && friendIds.length === 0) {
      return [];
    }
  }

  let query = client
    .from("lore_entries")
    .select("id, quest_id, title, journal, location_name, cover_photo_url, profiles!lore_entries_user_id_fkey(id, handle, full_name, avatar_url), quests(accent)");

  if (friendIds) {
    query = query.in("user_id", friendIds);
  } else if (userId) {
    query = query.neq("user_id", userId);
  }

  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .limit(12);

  if (error) {
    console.warn("Expanded friend lore query failed; falling back to the stable feed query.", error);

    let fallbackQuery = client
      .from("lore_entries")
      .select("id, title, location_name, cover_photo_url, profiles!lore_entries_user_id_fkey(id, handle, full_name), quests(accent)");

    if (friendIds) {
      fallbackQuery = fallbackQuery.in("user_id", friendIds);
    } else if (userId) {
      fallbackQuery = fallbackQuery.neq("user_id", userId);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery
      .order("occurred_at", { ascending: false })
      .limit(12);

    if (fallbackError) throw fallbackError;

    const fallbackRows = (fallbackData ?? []) as unknown as FriendMomentRow[];
    const fallbackEngagement = await fetchFriendMomentEngagement(fallbackRows.map((row) => row.id), userId);

    return fallbackRows.map((item) => ({
      id: item.id,
      profileId: item.profiles?.id,
      name: item.profiles?.full_name ?? "A friend",
      handle: item.profiles?.handle,
      title: item.title,
      location: item.location_name,
      reaction: "This belongs in a proper field journal.",
      imageUrl: item.cover_photo_url ?? "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=85",
      accent: item.quests?.accent ?? "forest",
      likeCount: fallbackEngagement.likeCounts[item.id] ?? 0,
      commentCount: fallbackEngagement.commentCounts[item.id] ?? 0,
      likedByMe: fallbackEngagement.likedEntryIds.has(item.id)
    } satisfies FriendMoment));
  }

  const rows = (data ?? []) as unknown as FriendMomentRow[];
  const engagement = await fetchFriendMomentEngagement(rows.map((row) => row.id), userId);

  return rows.map((item) => {
    return {
      id: item.id,
      profileId: item.profiles?.id,
      name: item.profiles?.full_name ?? "A friend",
      handle: item.profiles?.handle,
      avatarUrl: item.profiles?.avatar_url,
      questId: item.quest_id,
      title: item.title,
      location: item.location_name,
      reaction: item.journal || "This belongs in a proper field journal.",
      imageUrl: item.cover_photo_url ?? "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=85",
      accent: item.quests?.accent ?? "forest",
      likeCount: engagement.likeCounts[item.id] ?? 0,
      commentCount: engagement.commentCounts[item.id] ?? 0,
      likedByMe: engagement.likedEntryIds.has(item.id)
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

async function fetchLoreCommentsFromSupabase(entryId: string): Promise<LoreComment[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("lore_comments")
    .select("id, entry_id, body, created_at, profiles(id, handle, full_name, avatar_url)")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingEngagementTable(error)) return [];
    throw error;
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    entry_id: string;
    body: string;
    created_at: string;
    profiles: {
      id: string;
      handle: string;
      full_name: string;
      avatar_url: string | null;
    } | null;
  }>).map((comment) => ({
    id: comment.id,
    entryId: comment.entry_id,
    body: comment.body,
    createdAt: comment.created_at,
    author: {
      id: comment.profiles?.id ?? "unknown",
      name: comment.profiles?.full_name ?? "A friend",
      handle: comment.profiles?.handle ?? "friend",
      avatarUrl: comment.profiles?.avatar_url
    }
  }));
}

async function fetchLoreLikeState(entryId: string, userId?: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("lore_likes")
    .select("entry_id, user_id")
    .eq("entry_id", entryId);

  if (error) {
    if (isMissingEngagementTable(error)) return { likeCount: 0, likedByMe: false };
    throw error;
  }

  const likes = (data ?? []) as Array<{ entry_id: string; user_id: string }>;
  return {
    likeCount: likes.length,
    likedByMe: likes.some((like) => like.user_id === userId)
  };
}

export function useLoreComments(entryId?: string) {
  return useQuery({
    queryKey: ["lore-comments", entryId],
    queryFn: () => entryId ? fetchLoreCommentsFromSupabase(entryId) : Promise.resolve([]),
    enabled: !!entryId
  });
}

export function useLoreLikeState(entryId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lore-like-state", entryId, user?.id],
    queryFn: () => entryId ? fetchLoreLikeState(entryId, user?.id) : Promise.resolve({ likeCount: 0, likedByMe: false }),
    enabled: !!entryId
  });
}

export function useToggleLoreLike() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, liked }: { entryId: string; liked: boolean }) => {
      if (!user || !supabase) return;
      const client = requireSupabase();

      if (liked) {
        const { error } = await client
          .from("lore_likes")
          .delete()
          .eq("entry_id", entryId)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }

      const { error } = await client
        .from("lore_likes")
        .insert({ entry_id: entryId, user_id: user.id });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-moments"] }),
        queryClient.invalidateQueries({ queryKey: ["lore-like-state", variables.entryId] })
      ]);
    }
  });
}

export function useAddLoreComment() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, body }: { entryId: string; body: string }) => {
      const trimmedBody = body.trim();
      if (!user || !supabase || !trimmedBody) return;

      const { error } = await requireSupabase()
        .from("lore_comments")
        .insert({ entry_id: entryId, user_id: user.id, body: trimmedBody });

      if (error) throw error;
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-moments"] }),
        queryClient.invalidateQueries({ queryKey: ["lore-comments", variables.entryId] })
      ]);
    }
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

export function useFriendProfile(userId?: string) {
  return useQuery({
    queryKey: ["friend-profile", userId],
    queryFn: async () => {
      if (!supabase || !userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, full_name, avatar_url, home_city, points_total")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data ? mapProfile(data as ProfileRow) : null;
    },
    enabled: !!userId && !!supabase
  });
}

export function useFriendInProgressQuests(userId?: string) {
  return useQuery({
    queryKey: ["friend-in-progress-quests", userId],
    queryFn: async () => {
      if (!supabase || !userId) return [];

      const { data, error } = await supabase
        .from("user_quests")
        .select("quest_id, completed_step_indexes, quests(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as unknown as UserQuestRow[])
        .map((row) => row.quests ? mapQuest(row.quests) : null)
        .filter((quest): quest is Quest => !!quest);
    },
    enabled: !!userId && !!supabase
  });
}

async function fetchFriendGroups(userId: string) {
  if (!supabase) return [];

  let ownedGroups: any = await supabase
    .from("friend_groups")
    .select("id, owner_id, name, banner_image_url, created_at")
    .eq("owner_id", userId);

  if (ownedGroups.error) {
    ownedGroups = await supabase
      .from("friend_groups")
      .select("id, owner_id, name, created_at")
      .eq("owner_id", userId);
  }

  const memberships = await supabase
    .from("friend_group_members")
    .select("group_id, user_id")
    .eq("user_id", userId);

  if (ownedGroups.error) throw ownedGroups.error;
  if (memberships.error) throw memberships.error;

  const groupIds = Array.from(new Set([
    ...((ownedGroups.data ?? []) as FriendGroupRow[]).map((group) => group.id),
    ...(memberships.data ?? []).map((membership) => membership.group_id)
  ]));

  if (groupIds.length === 0) return [];

  let [groupsResult, membersResult, groupQuestsResult]: any[] = await Promise.all([
    supabase
      .from("friend_groups")
      .select("id, owner_id, name, banner_image_url, created_at")
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

  if (groupsResult.error) {
    groupsResult = await supabase
      .from("friend_groups")
      .select("id, owner_id, name, created_at")
      .in("id", groupIds);
  }

  if (groupsResult.error) throw groupsResult.error;
  if (membersResult.error) throw membersResult.error;
  if (groupQuestsResult.error) throw groupQuestsResult.error;

  const groups = (groupsResult.data ?? []) as FriendGroupRow[];
  const members = (membersResult.data ?? []) as FriendGroupMemberRow[];
  const groupQuests = (groupQuestsResult.data ?? []) as FriendGroupQuestRow[];
  const ownerIds = groups.map((group) => group.owner_id);
  const memberIds = Array.from(new Set([
    ...members.map((member) => member.user_id),
    ...ownerIds
  ]));
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
    bannerImageUrl: group.banner_image_url ?? null,
    createdAt: group.created_at,
    members: [
      ...members.filter((member) => member.group_id === group.id),
      { group_id: group.id, user_id: group.owner_id } satisfies FriendGroupMemberRow
    ]
      .filter((member, index, allMembers) => allMembers.findIndex((item) => item.user_id === member.user_id) === index)
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
    queryKey: ["friend-groups", isBackendReady ? "remote" : "preview", user?.id],
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
    mutationFn: async ({
      groupId,
      name,
      bannerImageUrl,
      bannerAsset
    }: {
      groupId: string;
      name: string;
      bannerImageUrl?: string | null;
      bannerAsset?: { uri: string; mimeType?: string | null };
    }) => {
      if (!user) throw new Error("Sign in before renaming a group.");
      const client = requireSupabase();
      const updates: { name: string; banner_image_url?: string | null } = {
        name: name.trim() || "Untitled circle"
      };

      if (bannerAsset) {
        updates.banner_image_url = await uploadFriendGroupBanner(user.id, groupId, bannerAsset);
      } else if (bannerImageUrl !== undefined) {
        updates.banner_image_url = bannerImageUrl?.trim() || null;
      }

      const { error } = await client
        .from("friend_groups")
        .update(updates)
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
      const rpcResult = await client.rpc("add_friend_group_quest", {
        target_group_id: groupId,
        target_quest_id: questId
      });

      if (!rpcResult.error) return;

      throw new Error(formatSupabaseError(rpcResult.error));
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
      const rpcResult = await client.rpc("remove_friend_group_quest", {
        target_group_id: groupId,
        target_quest_id: questId
      });

      if (!rpcResult.error) return;

      const { error } = await client
        .from("friend_group_quests")
        .delete()
        .eq("group_id", groupId)
        .eq("quest_id", questId);

      if (error) throw new Error(formatSupabaseError(error));
    },
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<FriendGroup[]>(
        { queryKey: ["friend-groups"] },
        (current) => current?.map((group) => (
          group.id === variables.groupId
            ? { ...group, quests: group.quests.filter((quest) => quest.id !== variables.questId) }
            : group
        )) ?? current
      );
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["group-quest-progress", variables.questId] });
    }
  });
}

export function useDeleteFriendGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("Sign in before deleting a group.");
      const client = requireSupabase();
      const { error } = await client
        .from("friend_groups")
        .delete()
        .eq("id", groupId)
        .eq("owner_id", user.id);

      if (error) throw new Error(formatSupabaseError(error));
    },
    onSuccess: (_data, groupId) => {
      queryClient.setQueriesData<FriendGroup[]>(
        { queryKey: ["friend-groups"] },
        (current) => current?.filter((group) => group.id !== groupId) ?? current
      );
      void queryClient.invalidateQueries({ queryKey: ["friend-groups"] });
    }
  });
}

export function useLeaveFriendGroup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!user) throw new Error("Sign in before leaving a group.");
      const client = requireSupabase();
      const { data, error } = await client
        .from("friend_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .select("group_id");

      if (error || (data?.length ?? 0) === 0) {
        const { error: rpcError } = await client.rpc("leave_friend_group", { target_group_id: groupId });
        if (rpcError) throw new Error(formatSupabaseError(rpcError));
      }
    },
    onSuccess: (_data, groupId) => {
      queryClient.setQueriesData<FriendGroup[]>(
        { queryKey: ["friend-groups"] },
        (current) => current?.filter((group) => group.id !== groupId) ?? current
      );
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

      if (!supabase) {
        return [...group.members]
          .map((member) => ({ ...member, points: member.pointsTotal }))
          .sort((a, b) => b.points - a.points);
      }

      if (memberIds.length === 0) return [];

      const ledgerResult = await supabase.rpc("friend_group_leaderboard_points", {
        target_group_id: group.id,
        period_filter: filter
      });

      if (!ledgerResult.error) {
        const pointsByUser = new Map(
          ((ledgerResult.data ?? []) as FriendGroupLeaderboardPointRow[]).map((row) => [row.user_id, row.points ?? 0])
        );

        return group.members
          .map((member) => ({ ...member, points: pointsByUser.get(member.id) ?? 0 }))
          .sort((a, b) => b.points - a.points);
      }

      if (filter === "all_time") {
        return [...group.members]
          .map((member) => ({ ...member, points: member.pointsTotal }))
          .sort((a, b) => b.points - a.points);
      }

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
