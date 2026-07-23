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
import { QuestCountry } from "../../../shared/types/domain";

export type QuestRow = {
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
  
  category?: string;
  cost?: string;
  length?: string;
  difficulty?: string;
  country?: string;
  min_participants?: number;
  max_participants?: number;
  seasons?: string[];
  accessibility?: string[];
  location_types?: string[];
  image_position?: string; 
  categories?: string[];
  gallery_urls?: string[];

  // ✨ NEW: The stats returned by our Supabase View
  view_count?: number;
  active_count?: number;
  completed_count?: number;
  recent_avatars?: string[];
};

export function mapQuest(row: QuestRow): Quest {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kicker: row.kicker,
    description: row.description,
    whyItMatters: row.why_it_matters || "",
    locationHint: row.location_hint || "Anywhere",
    duration: row.duration_label || row.length || "Half day",
    mood: row.mood || "wild",
    accent: row.accent || "orange",
    imageUrl: row.image_url,
    steps: row.steps ?? [],
    contentBlocks: row.content_blocks || null,
    journalPrompt: row.journal_prompt || "",
    pointsValue: row.points_value || 10,
    imagePosition: (row.image_position as "top" | "center" | "bottom") || "center",
    galleryUrls: row.gallery_urls || [],
    categories: (row.categories as QuestCategory[]) || (row.category ? [row.category as QuestCategory] : ["Adventure"]),
    category: (row.category as QuestCategory) || "Adventure",
    cost: (row.cost as QuestCost) || "Free",
    length: (row.length as QuestLength) || "Half day",
    difficulty: (row.difficulty as QuestDifficulty) || "Medium",
    country: (row.country as QuestCountry) || "Any",
    minParticipants: row.min_participants || 1,
    maxParticipants: row.max_participants || 1,
    seasons: (row.seasons as QuestSeason[]) || ["All year"],
    accessibility: (row.accessibility as QuestAccessibility[]) || [],
    locationTypes: (row.location_types as QuestLocationType[]) || ["Anywhere"],
    
    // ✨ NEW: Map the stats to the frontend object
    stats: {
      views: row.view_count || 0,
      inProgress: row.active_count || 0,
      completed: row.completed_count || 0,
      recentAvatars: row.recent_avatars || []
    }
  };
}

async function fetchQuestsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("v_quests_with_stats") // ✨ Read from the new View, not the raw table!
    .select("*") 
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

// ✨ NEW: Mutation to trigger a view count increment
export function useTrackQuestView() {
  const { isBackendReady } = useAuth();
  return useMutation({
    mutationFn: async (questId: string) => {
      if (!isBackendReady || !supabase) return;
      const { error } = await supabase.rpc("increment_quest_view", { quest_id_param: questId });
      if (error) throw error;
    }
  });
}

export function useActivateQuest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activateQuest = useExperienceStore((state) => state.activateQuest);

  return useMutation({
    mutationFn: async (questId: string) => {
      activateQuest(questId); 
      if (!user || !supabase) return;

      const { error } = await supabase
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: questId, status: "active" }, { onConflict: "user_id,quest_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["quests"] }); // ✨ Force refresh stats
    }
  });
}

export function useQuitQuest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const quitQuest = useExperienceStore((state) => state.quitQuest);

  return useMutation({
    onMutate: (questId) => {
      quitQuest(questId);
      queryClient.setQueryData(
        ["user-quest-state", questId, user?.id],
        { status: "dismissed", completedStepIndexes: [] }
      );
      queryClient.setQueriesData(
        { queryKey: ["user-quest-state", questId] },
        { status: "dismissed", completedStepIndexes: [] }
      );
    },
    mutationFn: async (questId: string) => {
      if (!user || !supabase) return;

      const quitUpdate = await supabase
        .from("user_quests")
        .update({ status: "dismissed", completed_step_indexes: [] })
        .eq("user_id", user.id)
        .eq("quest_id", questId);

      if (quitUpdate.error) {
        const fallback = await supabase
          .from("user_quests")
          .update({ status: "dismissed" })
          .eq("user_id", user.id)
          .eq("quest_id", questId);

        if (fallback.error) throw fallback.error;
      }
    },
    onSuccess: (_data, questId) => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["user-quest-state", questId] });
      void queryClient.invalidateQueries({ queryKey: ["group-quest-progress", questId] });
      void queryClient.invalidateQueries({ queryKey: ["quests"] });
    }
  });
}

export function useQuitAllActiveQuests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const quitQuest = useExperienceStore((state) => state.quitQuest);
  const activeQuests = useExperienceStore((state) => state.activeQuests);

  return useMutation({
    onMutate: () => {
      Object.keys(activeQuests).forEach((questId) => quitQuest(questId));
      queryClient.setQueriesData(
        { queryKey: ["user-quest-state"] },
        (current: unknown) => current && typeof current === "object"
          ? { status: "dismissed", completedStepIndexes: [] }
          : current
      );
      queryClient.setQueryData(
        ["user-quests-status", user?.id],
        (current: { active: string[]; completed: string[] } | undefined) => ({
          active: [],
          completed: current?.completed ?? []
        })
      );
    },
    mutationFn: async () => {
      if (!user || !supabase) return;

      const quitUpdate = await supabase
        .from("user_quests")
        .update({ status: "dismissed", completed_step_indexes: [] })
        .eq("user_id", user.id)
        .eq("status", "active");

      if (quitUpdate.error) {
        const fallback = await supabase
          .from("user_quests")
          .update({ status: "dismissed" })
          .eq("user_id", user.id)
          .eq("status", "active");

        if (fallback.error) throw fallback.error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["active-quests"] });
      void queryClient.invalidateQueries({ queryKey: ["user-quest-state"] });
      void queryClient.invalidateQueries({ queryKey: ["group-quest-progress"] });
      void queryClient.invalidateQueries({ queryKey: ["user-quests-status"] });
      void queryClient.invalidateQueries({ queryKey: ["quests"] });
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
      
      // 1. Safely grab the list of quest IDs the user is currently doing
      const { data: userQuests, error: uqError } = await supabase
        .from("user_quests")
        .select("quest_id")
        .eq("user_id", user.id)
        .eq("status", "active");
        
      if (uqError) throw uqError;
      
      if (!userQuests || userQuests.length === 0) return [];
      
      const questIds = userQuests.map(uq => uq.quest_id);
      
      // 2. Fetch those quests from our new rich View so they have live stats!
      const { data: questsData, error: qError } = await supabase
        .from("v_quests_with_stats")
        .select("*")
        .in("id", questIds);
        
      if (qError) throw qError;
      
      return (questsData || []).map((row) => mapQuest(row as QuestRow));
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
      toggleSavedQuest(questId);
      if (!isBackendReady || !user || !supabase) return;

      const { error } = await supabase
        .from("user_quests")
        .upsert({ user_id: user.id, quest_id: questId, status: "saved" }, { onConflict: "user_id,quest_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quests"] });
    }
  });
}
