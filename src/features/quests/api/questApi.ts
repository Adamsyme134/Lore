import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { previewQuests } from "../../../shared/data/previewData";
import type { Quest } from "../../../shared/types/domain";
import type { Accent } from "../../../shared/design/tokens";
import { useExperienceStore } from "../../app/store/useExperienceStore";

type QuestRow = {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  description: string;
  why_it_matters: string;
  location_hint: string;
  duration_label: string;
  mood: Quest["mood"];
  accent: Accent;
  image_url: string;
  steps: string[] | null;
  journal_prompt: string;
  points_value: number;
};

function mapQuest(row: QuestRow): Quest {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kicker: row.kicker,
    description: row.description,
    whyItMatters: row.why_it_matters,
    locationHint: row.location_hint,
    duration: row.duration_label,
    mood: row.mood,
    accent: row.accent,
    imageUrl: row.image_url,
    steps: row.steps ?? [],
    journalPrompt: row.journal_prompt,
    pointsValue: row.points_value
  };
}

async function fetchQuestsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("quests")
    .select("id, slug, title, kicker, description, why_it_matters, location_hint, duration_label, mood, accent, image_url, steps, journal_prompt, points_value")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapQuest(row as QuestRow));
}

export function useQuests() {
  const { isBackendReady } = useAuth();

  return useQuery({
    queryKey: ["quests", isBackendReady ? "remote" : "preview"],
    queryFn: () => (isBackendReady ? fetchQuestsFromSupabase() : Promise.resolve(previewQuests)),
    initialData: previewQuests
  });
}

export function useQuest(id?: string) {
  const questsQuery = useQuests();

  return {
    ...questsQuery,
    data: questsQuery.data.find((quest) => quest.id === id || quest.slug === id) ?? null
  };
}

export function useSaveQuest() {
  const { isBackendReady, user } = useAuth();
  const queryClient = useQueryClient();
  const toggleSavedQuest = useExperienceStore((state) => state.toggleSavedQuest);

  return useMutation({
    mutationFn: async (questId: string) => {
      if (!isBackendReady || !user || !supabase) {
        toggleSavedQuest(questId);
        return;
      }

      const { error } = await supabase
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: questId, status: "saved" }, { onConflict: "user_id,quest_id" });

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
    }
  });
}
