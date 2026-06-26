import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { previewFriendMoments } from "../../../shared/data/previewData";
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

async function fetchFriendMomentsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("lore_entries")
    .select("id, title, location_name, cover_photo_url, profiles(id, handle, full_name), quests(accent)")
    .order("occurred_at", { ascending: false })
    .limit(12);

  if (error) {
    throw error;
  }

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
  const { isBackendReady } = useAuth();

  return useQuery({
    queryKey: ["friend-moments", isBackendReady ? "remote" : "preview"],
    queryFn: () => (isBackendReady ? fetchFriendMomentsFromSupabase() : Promise.resolve(previewFriendMoments)),
    initialData: previewFriendMoments
  });
}

export function useSendFriendRequest() {
  const { isBackendReady, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (handle: string) => {
      const cleanedHandle = handle.trim().toLowerCase().replace(/^@/, "");

      if (!cleanedHandle) {
        throw new Error("Enter a handle.");
      }

      if (!isBackendReady || !user || !supabase) {
        return { preview: true };
      }

      const client = requireSupabase();
      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("id, handle, full_name, avatar_url, home_city, points_total")
        .eq("handle", cleanedHandle)
        .single();

      if (profileError || !profile) {
        throw new Error("No profile found with that handle.");
      }

      const target = mapProfile(profile as ProfileRow);

      if (target.id === user.id) {
        throw new Error("You cannot add yourself.");
      }

      const { error } = await client.from("friend_requests").insert({
        requester_id: user.id,
        addressee_id: target.id,
        status: "pending"
      });

      if (error) {
        throw error;
      }

      return target;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    }
  });
}
