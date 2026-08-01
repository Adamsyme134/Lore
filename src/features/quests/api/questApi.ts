import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { previewJourneys, previewQuests } from "../../../shared/data/previewData";
import type { 
  Journey,
  JourneyTimelineItem,
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
import { getJourneyQuestIdsFromTree } from "../utils/journeyTree";

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
  auto_complete_quest_ids?: string[];

  // ✨ NEW: The stats returned by our Supabase View
  view_count?: number;
  active_count?: number;
  completed_count?: number;
  recent_avatars?: string[];
};

export type JourneyRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  visibility?: "global" | "exclusive" | null;
  background_image_url: string;
  image_position?: string;
  icon_name?: string;
  color_scheme_id?: Journey["colorSchemeId"] | null;
  timeline?: JourneyTimelineItem[] | null;
  completed_count?: number;
  total_count?: number;
  next_quest_id?: string | null;
  next_quest_title?: string;
  next_quest_image_url?: string;
  quest_ids?: string[];
  public_quest_ids?: string[];
  root_quest_ids?: string[];
  ring_order?: number | null;
  tree_nodes?: Journey["treeNodes"];
  tree_edges?: Journey["treeEdges"];
  requirement_sets?: Journey["requirementSets"];
  capability_unlocks?: Journey["capabilityUnlocks"];
  is_active?: boolean;
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
    autoCompleteQuestIds: row.auto_complete_quest_ids || [],
    categories: (row.categories as QuestCategory[]) || (row.category ? [row.category as QuestCategory] : ["Adventure"]),
    category: (row.category as QuestCategory) || "Adventure",
    cost: (row.cost as QuestCost) || "Free",
    length: (row.length as QuestLength) || "A few hours",
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

export function mapJourney(row: JourneyRow): Journey {
  const timeline = row.timeline ?? [];
  const completedCount = row.completed_count ?? timeline.filter((item) => item.isComplete).length;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || "",
    visibility: row.visibility || "global",
    backgroundImageUrl: row.background_image_url,
    imagePosition: row.image_position || "50% 50%",
    iconName: row.icon_name || "trail-sign-outline",
    colorSchemeId: row.color_scheme_id || "forest",
    timeline,
    completedCount,
    totalCount: row.total_count || Math.max(timeline.length, completedCount),
    nextQuestId: row.next_quest_id ?? null,
    nextQuestTitle: row.next_quest_title || "Choose your next quest",
    nextQuestImageUrl: row.next_quest_image_url || row.background_image_url,
    questIds: row.quest_ids || [],
    publicQuestIds: row.public_quest_ids || [],
    rootQuestIds: row.root_quest_ids || [],
    ringOrder: row.ring_order ?? null,
    treeNodes: row.tree_nodes || [],
    treeEdges: row.tree_edges || [],
    requirementSets: row.requirement_sets || [],
    capabilityUnlocks: row.capability_unlocks || [],
    isActive: row.is_active ?? true
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

async function fetchJourneysFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("journeys")
    .select("*")
    .eq("is_active", true)
    .order("ring_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapJourney(row as JourneyRow));
}

export function useQuests() {
  const { isBackendReady } = useAuth();
  return useQuery({
    queryKey: ["quests", isBackendReady ? "remote" : "preview"],
    queryFn: () => (isBackendReady ? fetchQuestsFromSupabase() : Promise.resolve(previewQuests)),
    initialData: isBackendReady ? undefined : previewQuests
  });
}

export function useJourneys() {
  const { isBackendReady } = useAuth();
  return useQuery({
    queryKey: ["journeys", isBackendReady ? "remote" : "preview"],
    queryFn: () => (isBackendReady ? fetchJourneysFromSupabase() : Promise.resolve(previewJourneys)),
    initialData: isBackendReady ? undefined : previewJourneys
  });
}

export type UserQuestStatuses = {
  active: string[];
  completed: string[];
  saved: string[];
  dismissed: string[];
  completedStepIndexesByQuestId: Record<string, number[]>;
};

type UserQuestStatusKey = "active" | "completed" | "saved" | "dismissed";

export type UserJourneyStatuses = {
  active: string[];
  completed: string[];
  dismissed: string[];
};

export function useUserQuestStatuses() {
  const { isBackendReady, user } = useAuth();
  const savedQuestIds = useExperienceStore((state) => state.savedQuestIds);
  const completedQuestIds = useExperienceStore((state) => state.completedQuestIds);
  const activeQuests = useExperienceStore((state) => state.activeQuests);

  const localStatuses: UserQuestStatuses = {
    active: Object.keys(activeQuests),
    completed: completedQuestIds,
    saved: savedQuestIds,
    dismissed: [],
    completedStepIndexesByQuestId: activeQuests
  };

  return useQuery({
    queryKey: [
      "user-quests-status",
      user?.id,
      isBackendReady ? "remote" : "preview",
      isBackendReady ? null : localStatuses.active,
      isBackendReady ? null : localStatuses.completed,
      isBackendReady ? null : localStatuses.saved
    ],
    queryFn: async () => {
      if (!isBackendReady || !user || !supabase) return localStatuses;

      const { data, error } = await supabase
        .from("user_quests")
        .select("quest_id, status, completed_step_indexes")
        .eq("user_id", user.id);

      if (error) throw error;

      return (data ?? []).reduce<UserQuestStatuses>(
        (statuses, item) => {
          const status = item.status as UserQuestStatusKey;
          if (status in statuses) {
            statuses[status].push(item.quest_id);
          }
          statuses.completedStepIndexesByQuestId[item.quest_id] = item.completed_step_indexes ?? [];
          return statuses;
        },
        { active: [], completed: [], saved: [], dismissed: [], completedStepIndexesByQuestId: {} }
      );
    },
    initialData: localStatuses
  });
}

export function useUserJourneyStatuses() {
  const { isBackendReady, user } = useAuth();
  const activeJourneyIds = useExperienceStore((state) => state.activeJourneyIds);

  const localStatuses: UserJourneyStatuses = {
    active: activeJourneyIds,
    completed: [],
    dismissed: []
  };

  return useQuery({
    queryKey: [
      "user-journeys-status",
      user?.id,
      isBackendReady ? "remote" : "preview",
      isBackendReady ? null : localStatuses.active
    ],
    queryFn: async () => {
      if (!isBackendReady || !user || !supabase) return localStatuses;

      const { data, error } = await supabase
        .from("user_journeys")
        .select("journey_id, status")
        .eq("user_id", user.id);

      if (error) throw error;

      return (data ?? []).reduce<UserJourneyStatuses>(
        (statuses, item) => {
          const status = item.status as keyof UserJourneyStatuses;
          if (status in statuses) {
            statuses[status].push(item.journey_id);
          }
          return statuses;
        },
        { active: [], completed: [], dismissed: [] }
      );
    },
    initialData: localStatuses
  });
}

export function getJourneyQuestIds(journey: Journey) {
  if (journey.treeNodes?.length) {
    const questById = new Map<string, Quest>();
    return getJourneyQuestIdsFromTree(journey, questById);
  }

  return journey.questIds.length
    ? journey.questIds
    : journey.timeline.map((item) => item.questId).filter(Boolean) as string[];
}

function getGloballyAvailableJourneyQuestIds(journeys: Journey[]) {
  const globallyAvailableQuestIds = new Set<string>();

  journeys
    .filter((journey) => journey.isActive)
    .forEach((journey) => {
      const questIds = getJourneyQuestIds(journey);

      if (journey.visibility !== "exclusive") {
        questIds.forEach((questId) => globallyAvailableQuestIds.add(questId));
        return;
      }

      const publicQuestIds = new Set(journey.publicQuestIds ?? []);
      questIds
        .filter((questId) => publicQuestIds.has(questId))
        .forEach((questId) => globallyAvailableQuestIds.add(questId));
    });

  return globallyAvailableQuestIds;
}

export function getExclusiveJourneyQuestIds(journeys: Journey[]) {
  const globallyAvailableQuestIds = getGloballyAvailableJourneyQuestIds(journeys);

  return new Set(
    journeys
      .filter((journey) => journey.isActive && journey.visibility === "exclusive")
      .flatMap((journey) => {
        const publicQuestIds = new Set(journey.publicQuestIds ?? []);
        return getJourneyQuestIds(journey).filter(
          (questId) => !publicQuestIds.has(questId) && !globallyAvailableQuestIds.has(questId)
        );
      })
  );
}

export function getExclusiveQuestLock(
  questId: string,
  journeys: Journey[],
  completedQuestIds: Set<string>,
  activeJourneyIds: Set<string> = new Set()
) {
  const rootLockedJourney = journeys.find((item) => {
    if (!item.isActive || !(item.rootQuestIds ?? []).length || (item.publicQuestIds ?? []).includes(questId)) return false;
    const questIds = getJourneyQuestIds(item);
    return questIds[0] === questId && (item.rootQuestIds ?? []).some((rootQuestId) => !completedQuestIds.has(rootQuestId));
  });

  if (rootLockedJourney && !completedQuestIds.has(questId)) {
    return {
      journey: rootLockedJourney,
      isLocked: true,
      previousQuestId: (rootLockedJourney.rootQuestIds ?? []).find((rootQuestId) => !completedQuestIds.has(rootQuestId)) ?? null,
      reason: "previousQuest" as const
    };
  }

  if (getGloballyAvailableJourneyQuestIds(journeys).has(questId)) return null;

  const journey = journeys.find((item) => {
    if (!item.isActive || item.visibility !== "exclusive") return false;
    if ((item.publicQuestIds ?? []).includes(questId)) return false;
    return getJourneyQuestIds(item).includes(questId);
  });

  if (!journey) return null;

  if (!activeJourneyIds.has(journey.id)) {
    return { journey, isLocked: true, previousQuestId: null, reason: "journey" as const };
  }

  if (journey.visibility !== "exclusive" || (journey.publicQuestIds ?? []).includes(questId)) {
    return { journey, isLocked: false, previousQuestId: null, reason: null };
  }

  const questIds = getJourneyQuestIds(journey);
  const questIndex = questIds.indexOf(questId);
  if (completedQuestIds.has(questId)) {
    return { journey, isLocked: false, previousQuestId: null, reason: null };
  }

  if (questIndex <= 0) {
    const unmetRootQuestId = (journey.rootQuestIds ?? []).find((rootQuestId) => !completedQuestIds.has(rootQuestId));
    return {
      journey,
      isLocked: !!unmetRootQuestId,
      previousQuestId: unmetRootQuestId ?? null,
      reason: unmetRootQuestId ? "previousQuest" as const : null
    };
  }

  const previousQuestId = questIds[questIndex - 1];
  return {
    journey,
    isLocked: !completedQuestIds.has(previousQuestId),
    previousQuestId,
    reason: "previousQuest" as const
  };
}

export function useStartJourney() {
  const { isBackendReady, user } = useAuth();
  const queryClient = useQueryClient();
  const startJourney = useExperienceStore((state) => state.startJourney);

  return useMutation({
    mutationFn: async (journeyId: string) => {
      startJourney(journeyId);
      if (!isBackendReady || !user || !supabase) return;

      const { error } = await supabase
        .from("user_journeys")
        .upsert({ user_id: user.id, journey_id: journeyId, status: "active" }, { onConflict: "user_id,journey_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-journeys"] });
      void queryClient.invalidateQueries({ queryKey: ["user-journeys-status"] });
    }
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
        (current: UserQuestStatuses | undefined) => ({
          active: [],
          completed: current?.completed ?? [],
          saved: current?.saved ?? [],
          dismissed: current?.dismissed ?? [],
          completedStepIndexesByQuestId: {}
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
