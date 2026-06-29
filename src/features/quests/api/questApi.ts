import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { previewQuests } from "../../../shared/data/previewData";
import type { 
  Quest, 
  QuestCategory, 
  QuestCost, 
  QuestLength, 
  QuestDifficulty, 
  QuestSeason, 
  QuestAccessibility, 
  QuestLocationType 
} from "../../../shared/types/domain";
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
  content_blocks?: any;
  journal_prompt: string;
  points_value: number;
  
  // ✨ Add the dynamic columns so TS knows they might exist
  category?: string;
  cost?: string;
  length?: string;
  difficulty?: string;
  min_participants?: number;
  max_participants?: number;
  seasons?: string[];
  accessibility?: string[];
  location_types?: string[];
  image_position?: string; 
  categories?: string[];
};

function mapQuest(row: QuestRow): Quest {
  
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kicker: row.kicker,
    description: row.description,
    whyItMatters: row.why_it_matters || "",
    locationHint: row.location_hint || "Anywhere",
    duration: row.duration_label || row.length || "Half day", // ✨ Added fallback
    mood: row.mood || "wild",
    accent: row.accent || "orange",
    imageUrl: row.image_url,
    steps: row.steps ?? [],
    contentBlocks: row.content_blocks || null,
    journalPrompt: row.journal_prompt || "",
    pointsValue: row.points_value || 10,
    
    imagePosition: (row.image_position as "top" | "center" | "bottom") || "center",

    // ✨ Typecast the new fields
    categories: (row.categories as QuestCategory[]) || (row.category ? [row.category as QuestCategory] : ["Adventure"]),
    category: (row.category as QuestCategory) || "Adventure",
    cost: (row.cost as QuestCost) || "Free",
    length: (row.length as QuestLength) || "Half day",
    difficulty: (row.difficulty as QuestDifficulty) || "Medium",
    minParticipants: row.min_participants || 1,
    maxParticipants: row.max_participants || 1,
    seasons: (row.seasons as QuestSeason[]) || ["All year"],
    accessibility: (row.accessibility as QuestAccessibility[]) || [],
    locationTypes: (row.location_types as QuestLocationType[]) || ["Anywhere"],
    
  };
}


async function fetchQuestsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("quests")
    .select("*") // ✨ Changed this to "*" so it grabs all the new columns automatically
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => mapQuest(row as QuestRow));
}


export function useQuests() {
  const { isBackendReady } = useAuth();

  return useQuery({
    queryKey: ["quests", isBackendReady ? "remote" : "preview"],
    queryFn: () => (isBackendReady ? fetchQuestsFromSupabase() : Promise.resolve(previewQuests)),
    
    initialData: isBackendReady ? undefined : previewQuests
  });
}

export function useActivateQuest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activateQuest = useExperienceStore((state) => state.activateQuest); // ✨ Grab local action

  return useMutation({
    mutationFn: async (questId: string) => {
      activateQuest(questId); // ✨ Ensure instant UI update locally
      
      if (!user || !supabase) return;

      const { error } = await supabase
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: questId, status: "active" }, { onConflict: "user_id,quest_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
    }
  });
}

export function useQuest(id?: string) {
  const questsQuery = useQuests();

  return {
    ...questsQuery,
    data: questsQuery.data?.find((quest) => quest.id === id || quest.slug === id) ?? null,
  };
}

export function useActiveQuests() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["active-quests", user?.id],
    queryFn: async () => {
      if (!user || !supabase) return [];
      
      const { data, error } = await supabase
        .from("user_quests")
        .select("quest_id, quests(*)") // Join with quest details
        .eq("user_id", user.id)
        .eq("status", "active");
        
      if (error) throw error;
      return (data || []).map((item) => {
  // 1. Cast item.quests as 'any' first to bypass the initial structural check
  // 2. Then cast it as 'QuestRow' to satisfy your mapping function
  const questData = item.quests as any; 
  return mapQuest(questData as QuestRow);
});
    },
    enabled: !!user
  });
}

export function useSaveQuest() {
  const { isBackendReady, user } = useAuth();
  const queryClient = useQueryClient();
  const toggleSavedQuest = useExperienceStore((state) => state.toggleSavedQuest);

  return useMutation({
    mutationFn: async (questId: string) => {
      // ✨ FIX: Always toggle the local state immediately for instant UI feedback (the bookmark filling in)
      toggleSavedQuest(questId);

      // If the backend isn't ready or user isn't logged in, just rely on local state
      if (!isBackendReady || !user || !supabase) {
        return;
      }

      // Otherwise, sync this change to Supabase
      const { error } = await supabase
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: questId, status: "saved" }, { onConflict: "user_id,quest_id" });

      if (error) {
        console.error("Failed to sync save state to backend:", error);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
    }
  });
}
