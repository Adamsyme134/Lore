// src/features/social/api/socialApi.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";

import type { FriendMoment, Profile } from "../../../shared/types/domain";
import type { Accent } from "../../../shared/design/tokens";

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
    queryKey: ["friend-moments", user?.id],
    queryFn: () => fetchFriendMomentsFromSupabase(user?.id),
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