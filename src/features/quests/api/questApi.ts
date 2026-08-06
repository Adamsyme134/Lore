import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { requireSupabase, supabase } from "../../../lib/supabase";
import { previewJourneys, previewQuestCollections, previewQuests } from "../../../shared/data/previewData";
import type { 
  Journey,
  JourneyRequirementSet,
  JourneyTreeEdge,
  JourneyTreeNode,
  JourneyTimelineItem,
  QuestCollection,
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
import type { QuestInterestEvent, QuestInterestEventType } from "../../app/store/useExperienceStore";
import { QuestCountry } from "../../../shared/types/domain";
import { areRequirementSetsMet, getJourneyQuestIdsFromTree } from "../utils/journeyTree";

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
  unlock_quest_ids?: string[];
  unlocked_by_quest_ids?: string[];

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
  root_branch_side?: Journey["rootBranchSide"] | null;
  ring_order?: number | null;
  tree_nodes?: Journey["treeNodes"];
  tree_edges?: Journey["treeEdges"];
  requirement_sets?: Journey["requirementSets"];
  capability_unlocks?: Journey["capabilityUnlocks"];
  is_active?: boolean;
};

export type QuestCollectionRow = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  image_position?: string | null;
  icon_name?: string | null;
  quest_ids?: string[] | null;
  unlock_quest_ids?: string[] | null;
  always_unlocked?: boolean | null;
  unlocked_by_kind?: QuestCollection["unlockedByKind"] | null;
  unlocked_by_id?: string | null;
  is_active?: boolean | null;
};

type UserQuestEventRow = {
  quest_id: string;
  event_type: QuestInterestEventType;
  weight: number;
  created_at: string;
};

function mapJourneyRequirementSet(requirement: any): JourneyRequirementSet {
  return {
    ...requirement,
    questIds: requirement.questIds ?? requirement.quest_ids ?? [],
    journeyIds: requirement.journeyIds ?? requirement.journey_ids ?? [],
    capabilityIds: requirement.capabilityIds ?? requirement.capability_ids ?? [],
    minimumCompleted: requirement.minimumCompleted ?? requirement.minimum_completed
  };
}

function mapJourneyTreeNode(node: any): JourneyTreeNode {
  return {
    ...node,
    questId: node.questId ?? node.quest_id,
    iconName: node.iconName ?? node.icon_name,
    capabilityId: node.capabilityId ?? node.capability_id,
    branchId: node.branchId ?? node.branch_id,
    sharedAnchorNodeId: node.sharedAnchorNodeId ?? node.shared_anchor_node_id,
    layoutAngle: node.layoutAngle ?? node.layout_angle,
    layoutDepth: node.layoutDepth ?? node.layout_depth,
    hiddenUntil: (node.hiddenUntil ?? node.hidden_until ?? []).map(mapJourneyRequirementSet),
    prerequisites: (node.prerequisites ?? []).map(mapJourneyRequirementSet)
  };
}

function mapJourneyTreeEdge(edge: any): JourneyTreeEdge {
  return {
    ...edge,
    fromNodeId: edge.fromNodeId ?? edge.from_node_id,
    toNodeId: edge.toNodeId ?? edge.to_node_id,
    requirementSetIds: edge.requirementSetIds ?? edge.requirement_set_ids ?? [],
    hiddenUntilUnlocked: edge.hiddenUntilUnlocked ?? edge.hidden_until_unlocked
  };
}

const questEventWeights: Record<QuestInterestEventType, number> = {
  viewed: 1,
  clicked: 2,
  saved: 4,
  started: 6,
  completed: 10,
  completed_similar_journey: 12,
  completed_similar_collection: 12
};

export async function recordQuestEventRemote(questId: string, eventType: QuestInterestEventType) {
  if (!supabase) return;
  const { error } = await supabase.rpc("record_user_quest_event", {
    quest_id_param: questId,
    event_type_param: eventType,
    metadata_param: {}
  });

  if (error) {
    console.warn("Quest interest event was not recorded.", error);
  }
}

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
    unlockQuestIds: row.unlock_quest_ids || [],
    unlockedByQuestIds: row.unlocked_by_quest_ids || [],
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
    rootBranchSide: row.root_branch_side || "right",
    ringOrder: row.ring_order ?? null,
    treeNodes: (row.tree_nodes || []).map(mapJourneyTreeNode),
    treeEdges: (row.tree_edges || []).map(mapJourneyTreeEdge),
    requirementSets: (row.requirement_sets || []).map(mapJourneyRequirementSet),
    capabilityUnlocks: row.capability_unlocks || [],
    isActive: row.is_active ?? true
  };
}

export function mapQuestCollection(row: QuestCollectionRow): QuestCollection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || "",
    coverImageUrl: row.cover_image_url || "https://images.unsplash.com/photo-1445308394109-4ec2920981b1?auto=format&fit=crop&w=1200&q=85",
    imagePosition: row.image_position || "50% 50%",
    iconName: row.icon_name || "albums-outline",
    questIds: row.quest_ids || [],
    unlockQuestIds: row.unlock_quest_ids || [],
    alwaysUnlocked: row.always_unlocked ?? true,
    unlockedByKind: row.unlocked_by_kind || null,
    unlockedById: row.unlocked_by_id || null,
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

async function fetchQuestCollectionsFromSupabase() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("quest_collections")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapQuestCollection(row as QuestCollectionRow));
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

export function useQuestCollections() {
  const { isBackendReady } = useAuth();
  return useQuery({
    queryKey: ["quest-collections", isBackendReady ? "remote" : "preview"],
    queryFn: () => (isBackendReady ? fetchQuestCollectionsFromSupabase() : Promise.resolve(previewQuestCollections)),
    initialData: isBackendReady ? undefined : previewQuestCollections
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

export function useUserQuestInterestEvents() {
  const { isBackendReady, user } = useAuth();
  const previewEvents = useExperienceStore((state) => state.questInterestEvents);

  return useQuery({
    queryKey: ["user-quest-interest-events", isBackendReady ? "remote" : "preview", user?.id],
    queryFn: async (): Promise<QuestInterestEvent[]> => {
      if (!isBackendReady || !user || !supabase) return previewEvents;

      const { data, error } = await supabase
        .from("user_quest_events")
        .select("quest_id, event_type, weight, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.warn("Quest interest events are unavailable; recommendations will use status-only signals.", error);
        return [];
      }

      return ((data ?? []) as UserQuestEventRow[]).map((row) => ({
        questId: row.quest_id,
        eventType: row.event_type,
        weight: row.weight,
        createdAt: row.created_at
      }));
    },
    initialData: isBackendReady ? undefined : previewEvents
  });
}

export function useRecordQuestInterestEvent() {
  const { isBackendReady } = useAuth();
  const queryClient = useQueryClient();
  const recordPreviewEvent = useExperienceStore((state) => state.recordQuestInterestEvent);

  return useMutation({
    mutationFn: async ({ questId, eventType }: { questId: string; eventType: QuestInterestEventType }) => {
      recordPreviewEvent(questId, eventType, questEventWeights[eventType]);
      if (isBackendReady) {
        await recordQuestEventRemote(questId, eventType);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-quest-interest-events"] });
    }
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

export function getJourneyLock(
  journey: Journey,
  completedQuestIds: Set<string>,
  completedJourneyIds: Set<string>
) {
  if (getJourneyQuestIds(journey).some((questId) => completedQuestIds.has(questId))) return null;
  const unmetRootQuestId = (journey.rootQuestIds ?? []).find((questId) => !completedQuestIds.has(questId));
  if (unmetRootQuestId) return { isLocked: true };
  if (!journey.requirementSets?.length) return null;

  const isUnlocked = areRequirementSetsMet(journey.requirementSets, {
    completedQuestIds,
    completedJourneyIds
  });

  return isUnlocked ? null : { isLocked: true };
}

export function isQuestCollectionComplete(collection: QuestCollection, completedQuestIds: Set<string>) {
  return collection.questIds.length > 0 && collection.questIds.every((questId) => completedQuestIds.has(questId));
}

export function getQuestCollectionLock(
  collection: QuestCollection,
  collections: QuestCollection[],
  completedQuestIds: Set<string>
) {
  if (collection.alwaysUnlocked || !collection.unlockedByKind || !collection.unlockedById) return null;

  if (collection.unlockedByKind === "quest") {
    return completedQuestIds.has(collection.unlockedById) ? null : { isLocked: true };
  }

  const unlockingCollection = collections.find((item) => item.id === collection.unlockedById);
  if (!unlockingCollection) return { isLocked: true };

  return isQuestCollectionComplete(unlockingCollection, completedQuestIds) ? null : { isLocked: true };
}

export function getSideQuestLock(
  quest: Quest,
  quests: Quest[],
  completedQuestIds: Set<string>
) {
  if (completedQuestIds.has(quest.id)) return null;

  const unlockerIds = Array.from(new Set([
    ...(quest.unlockedByQuestIds ?? []),
    ...quests
      .filter((item) => (item.unlockQuestIds ?? []).includes(quest.id))
      .map((item) => item.id)
  ]));
  if (unlockerIds.length === 0) return null;
  if (unlockerIds.some((questId) => completedQuestIds.has(questId))) return null;

  const unlocker = unlockerIds
    .map((questId) => quests.find((item) => item.id === questId))
    .find(Boolean) as Quest | undefined;

  return {
    isLocked: true,
    unlockerQuestId: unlockerIds[0],
    unlockerQuestTitle: unlocker?.title || "the required quest"
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
  const recordPreviewEvent = useExperienceStore((state) => state.recordQuestInterestEvent);
  return useMutation({
    mutationFn: async (questId: string) => {
      recordPreviewEvent(questId, "viewed", questEventWeights.viewed);
      if (!isBackendReady || !supabase) return;
      await recordQuestEventRemote(questId, "viewed");
      const { error } = await supabase.rpc("increment_quest_view", { quest_id_param: questId });
      if (error) throw error;
    }
  });
}

export function useActivateQuest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activateQuest = useExperienceStore((state) => state.activateQuest);
  const recordPreviewEvent = useExperienceStore((state) => state.recordQuestInterestEvent);

  return useMutation({
    mutationFn: async (questId: string) => {
      activateQuest(questId); 
      recordPreviewEvent(questId, "started", questEventWeights.started);
      if (!user || !supabase) return;
      await recordQuestEventRemote(questId, "started");

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
  const recordPreviewEvent = useExperienceStore((state) => state.recordQuestInterestEvent);

  return useMutation({
    mutationFn: async (questId: string) => {
      toggleSavedQuest(questId);
      recordPreviewEvent(questId, "saved", questEventWeights.saved);
      if (!isBackendReady || !user || !supabase) return;
      await recordQuestEventRemote(questId, "saved");

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
