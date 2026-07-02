import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { useAuth } from "../../auth/AuthProvider";
import { useExperienceStore } from "../../app/store/useExperienceStore";
import type { LoreEntry, NewLoreEntryInput } from "../../../shared/types/domain";
import type { Accent } from "../../../shared/design/tokens";

type LoreEntryRow = {
  id: string;
  title: string;
  journal: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  mood: string;
  occurred_at: string;
  cover_photo_url: string | null;
  points_awarded: number;
  quest_id: string | null;
  quests: {
    title: string;
    accent: Accent;
  } | null;
  lore_photos: Array<{
    id: string;
    public_url: string;
    storage_path: string;
    width: number | null;
    height: number | null;
  }> | null;
};

function formatEntryDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function mapLoreEntry(row: LoreEntryRow): LoreEntry {
  const photos = (row.lore_photos ?? []).map((photo) => ({
    id: photo.id,
    uri: photo.public_url,
    storagePath: photo.storage_path,
    width: photo.width,
    height: photo.height
  }));

  const imageUrl = row.cover_photo_url ?? photos[0]?.uri ?? "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85";

  return {
    id: row.id,
    title: row.title,
    date: formatEntryDate(row.occurred_at),
    occurredAt: row.occurred_at,
    location: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    mood: row.mood,
    questId: row.quest_id,
    questTitle: row.quests?.title ?? "Independent entry",
    journal: row.journal,
    excerpt: row.journal,
    people: [],
    tags: [],
    imageUrl,
    photos: photos.length > 0 ? photos : [{ id: `${row.id}-cover`, uri: imageUrl }],
    accent: row.quests?.accent ?? "forest",
    pointsAwarded: row.points_awarded
  };
}

async function fetchLoreEntriesFromSupabase(userId: string): Promise<LoreEntry[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("lore_entries")
    .select("id, title, journal, location_name, latitude, longitude, mood, occurred_at, cover_photo_url, points_awarded, quest_id, quests(title, accent), lore_photos(id, public_url, storage_path, width, height)")
    .eq('user_id', userId)
    .order("occurred_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapLoreEntry(row as unknown as LoreEntryRow));
}

export function useLoreEntries() {
  const { isBackendReady, user } = useAuth();
  const previewLoreEntries = useExperienceStore((state) => state.previewLoreEntries);

  return useQuery({
    queryKey: ["lore-entries", isBackendReady ? "remote" : "preview", user?.id],
    queryFn: () => {
      // If no real backend, show the placeholders
      if (!isBackendReady) return Promise.resolve(previewLoreEntries);
      
      // If we have a user, fetch their real lore
      if (user?.id) return fetchLoreEntriesFromSupabase(user.id);
      
      // If still loading the user, return a true empty state, NOT fake data
      return Promise.resolve([]);
    }
    // ✨ REMOVED: initialData completely so fake data stops ghosting the UI
  });
}

export function useLoreEntry(id?: string) {
  const query = useLoreEntries();

  return {
    ...query,
    // ✨ ADDED: Optional chaining (?.) because data might be undefined while loading now
    data: query.data?.find((entry) => entry.id === id) ?? null
  };
}

async function uploadLorePhoto(userId: string, entryId: string, asset: NewLoreEntryInput["photoAssets"][number], index: number) {
  const client = requireSupabase();
  const extension = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const contentType = asset.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`;
  const storagePath = `${userId}/${entryId}/${Date.now()}-${index}.${extension}`;
  const arrayBuffer = await fetch(asset.uri).then((response) => response.arrayBuffer());

  const { error } = await client.storage
    .from("lore-photos")
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from("lore-photos").getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: data.publicUrl
  };
}

export function useCreateLoreEntry() {
  const { isBackendReady, user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const addPreviewLoreEntry = useExperienceStore((state) => state.addPreviewLoreEntry);

  return useMutation({
    mutationFn: async (input: NewLoreEntryInput) => {
      if (!isBackendReady || !user || !supabase) {
        return addPreviewLoreEntry({
          quest: input.quest,
          title: input.title,
          journal: input.journal,
          location: input.location,
          mood: input.mood,
          latitude: input.latitude,
          longitude: input.longitude,
          tags: input.tags,
          photoUris: input.photoAssets.map((asset) => asset.uri)
        });
      }

      const client = requireSupabase();
      const pointsAwarded = input.quest.pointsValue + Math.min(3, input.photoAssets.length) * 2;

      const { data: entryRow, error: entryError } = await client
        .from("lore_entries")
        .insert({
          user_id: user.id,
          quest_id: input.quest.id,
          title: input.title,
          journal: input.journal,
          location_name: input.location,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          mood: input.mood,
          occurred_at: new Date().toISOString(),
          points_awarded: pointsAwarded
        })
        .select("id")
        .single();

      if (entryError) {
        throw entryError;
      }

      const entryId = entryRow.id as string;
      const uploadedPhotos = await Promise.all(
  input.photoAssets.map((asset, index) => uploadLorePhoto(user.id, entryId, asset, index))
);

      if (uploadedPhotos.length > 0) {
        const { error: photoError } = await client.from("lore_photos").insert(
          uploadedPhotos.map((photo, index) => ({
            entry_id: entryId,
            user_id: user.id,
            storage_path: photo.storagePath,
            public_url: photo.publicUrl,
            width: input.photoAssets[index].width ?? null,
            height: input.photoAssets[index].height ?? null,
            sort_order: index
          }))
        );

        if (photoError) {
          throw photoError;
        }

        await client
          .from("lore_entries")
          .update({ cover_photo_url: uploadedPhotos[0].publicUrl })
          .eq("id", entryId);
      }

      await client
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: input.quest.id, status: "completed", completed_at: new Date().toISOString() }, { onConflict: "user_id,quest_id" });

      const { error: pointsError } = await client.rpc("award_lore_points", {
        entry_id: entryId,
        photo_count: input.photoAssets.length
      });

      if (pointsError) {
        throw pointsError;
      }

      const entries = await fetchLoreEntriesFromSupabase(user.id);
      const savedEntry = entries.find((entry) => entry.id === entryId) ?? entries[0];

      if (!savedEntry) {
        throw new Error("Lore entry was saved, but could not be read back from Supabase.");
      }

      return savedEntry;
    },
    onSuccess: async () => {
      await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["lore-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["points"] }),
        queryClient.invalidateQueries({ queryKey: ["active-quests"] }),
        queryClient.invalidateQueries({ queryKey: ["user-quests"] }),
        queryClient.invalidateQueries({ queryKey: ["user-quests-status"] })
  ]);
      await refreshProfile();
    }
  });
}
