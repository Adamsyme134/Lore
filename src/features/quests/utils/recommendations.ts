import type { Journey, Profile, Quest, QuestCollection, QuestCost, QuestDifficulty, QuestMood, QuestSeason } from "../../../shared/types/domain";
import type { QuestInterestEvent } from "../../app/store/useExperienceStore";

export type RecommendationMode = "Recommended" | "Trending" | "Nearby" | "Seasonal" | "Recently added";

export const RECOMMENDATION_MODES: RecommendationMode[] = ["Recommended", "Trending", "Nearby", "Seasonal", "Recently added"];

export const RECOMMENDATION_COPY: Record<RecommendationMode, { title: string; description: string }> = {
  Recommended: {
    title: "Recommended for you",
    description: "Quests picked just for you, based on your interests, past adventures and activity."
  },
  Trending: {
    title: "Trending adventures",
    description: "Quests people are viewing, starting and completing most right now."
  },
  Nearby: {
    title: "Nearby adventures",
    description: "Quests suited to places close to home, from city corners to countryside paths."
  },
  Seasonal: {
    title: "Seasonal picks",
    description: "Quests that fit the current season, plus a few all-year ideas."
  },
  "Recently added": {
    title: "Recently added",
    description: "The newest quests added to Lore, ready for your next adventure."
  }
};

type RecommendationProfile = Partial<Profile> & {
  country?: string | null;
  allowAbroad?: boolean | null;
  preferredCategories?: string[] | null;
  preferredMoods?: string[] | null;
  maxDifficulty?: QuestDifficulty | null;
  maxCost?: QuestCost | null;
};

type RecommendQuestsInput = {
  quests: Quest[];
  allQuests?: Quest[];
  completedQuestIds: Set<string>;
  activeQuestIds?: Set<string>;
  savedQuestIds?: Set<string>;
  journeys?: Journey[];
  collections?: QuestCollection[];
  events?: QuestInterestEvent[];
  profile?: RecommendationProfile | null;
  mode?: RecommendationMode;
};

export type RecommendationReason = {
  label: string;
  importance: number;
};

type QuestRecommendationReasonsInput = Omit<RecommendQuestsInput, "quests" | "mode"> & {
  quest: Quest;
  quests: Quest[];
};

const difficultyRank: Record<QuestDifficulty, number> = {
  Easy: 1,
  Medium: 2,
  Challenging: 3
};

const costRank: Record<QuestCost, number> = {
  Free: 0,
  "£": 1,
  "££": 2,
  "£££": 3
};

function getCurrentSeason(): QuestSeason {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(1, value));
}

function popularityScore(quest: Quest) {
  const stats = quest.stats;
  if (!stats) return 0;
  return normalizeScore((stats.views + stats.inProgress * 2 + stats.completed * 3) / 100);
}

function buildAffinity(events: QuestInterestEvent[], questsById: Map<string, Quest>) {
  const categoryWeights = new Map<string, number>();
  const moodWeights = new Map<QuestMood, number>();
  const questWeights = new Map<string, number>();

  events.forEach((event) => {
    const quest = questsById.get(event.questId);
    const weight = event.weight;
    questWeights.set(event.questId, (questWeights.get(event.questId) ?? 0) + weight);
    if (!quest) return;

    quest.categories.forEach((category) => {
      categoryWeights.set(category, (categoryWeights.get(category) ?? 0) + weight);
    });
    moodWeights.set(quest.mood, (moodWeights.get(quest.mood) ?? 0) + weight);
  });

  return { categoryWeights, moodWeights, questWeights };
}

function getWeightedMatch(values: string[], weights: Map<string, number>) {
  const total = Array.from(weights.values()).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return 0.5;
  return normalizeScore(values.reduce((sum, value) => sum + (weights.get(value) ?? 0), 0) / total);
}

function isEligibleQuest(quest: Quest, input: RecommendQuestsInput, currentSeason: QuestSeason) {
  const profile = input.profile;
  if (input.completedQuestIds.has(quest.id)) return false;

  if (!quest.seasons.includes(currentSeason) && !quest.seasons.includes("All year")) return false;

  const userCountry = profile?.country?.trim();
  const isAbroadQuest = quest.locationTypes.includes("Abroad");
  if (userCountry && quest.country !== "Any" && quest.country !== userCountry && !isAbroadQuest) return false;
  if (isAbroadQuest && profile?.allowAbroad === false) return false;

  if (profile?.maxDifficulty && difficultyRank[quest.difficulty] > difficultyRank[profile.maxDifficulty]) return false;
  if (profile?.maxCost && costRank[quest.cost] > costRank[profile.maxCost]) return false;

  return true;
}

function getJourneyQuestIds(journey: Journey) {
  if (journey.treeNodes?.length) {
    return journey.treeNodes.map((node) => node.questId).filter(Boolean) as string[];
  }

  return journey.questIds.length
    ? journey.questIds
    : journey.timeline.map((item) => item.questId).filter(Boolean) as string[];
}

function getCompletedRelationshipSignals(
  quest: Quest,
  completedQuestIds: Set<string>,
  journeys: Journey[] = [],
  collections: QuestCollection[] = []
) {
  const sameJourneyTitles = journeys
    .filter((journey) => {
      const questIds = getJourneyQuestIds(journey);
      return questIds.includes(quest.id) && questIds.some((questId) => questId !== quest.id && completedQuestIds.has(questId));
    })
    .map((journey) => journey.title);

  const sameCollectionTitles = collections
    .filter((collection) =>
      collection.questIds.includes(quest.id) &&
      collection.questIds.some((questId) => questId !== quest.id && completedQuestIds.has(questId))
    )
    .map((collection) => collection.title);

  return { sameJourneyTitles, sameCollectionTitles };
}

export function recommendQuests(input: RecommendQuestsInput) {
  const mode = input.mode ?? "Recommended";
  const currentSeason = getCurrentSeason();
  const contextQuests = input.allQuests ?? input.quests;
  const questsById = new Map(contextQuests.map((quest) => [quest.id, quest]));
  const completedQuests = contextQuests.filter((quest) => input.completedQuestIds.has(quest.id));
  const completedCategorySet = new Set(completedQuests.flatMap((quest) => quest.categories));
  const completedMoodSet = new Set(completedQuests.map((quest) => quest.mood));
  const affinity = buildAffinity(input.events ?? [], questsById);

  const eligible = input.quests.filter((quest) => isEligibleQuest(quest, input, currentSeason));

  if (mode === "Trending") {
    return eligible.slice().sort((a, b) => popularityScore(b) - popularityScore(a));
  }

  if (mode === "Nearby") {
    return eligible.filter((quest) =>
      quest.locationTypes.some((type) => type === "City" || type === "Town" || type === "Countryside" || type === "Anywhere")
    );
  }

  if (mode === "Seasonal") {
    return eligible.filter((quest) => quest.seasons.includes(currentSeason) || quest.seasons.includes("All year"));
  }

  if (mode === "Recently added") {
    return eligible;
  }

  const scored = eligible.map((quest) => {
    const completedRelationshipSignals = getCompletedRelationshipSignals(quest, input.completedQuestIds, input.journeys, input.collections);
    const explicitPreferenceMatch = [
      getWeightedMatch(quest.categories, affinity.categoryWeights),
      getWeightedMatch([quest.mood], affinity.moodWeights as Map<string, number>)
    ].reduce((sum, score) => sum + score, 0) / 2;

    const profileCategoryBoost = input.profile?.preferredCategories?.length
      ? quest.categories.some((category) => input.profile?.preferredCategories?.includes(category)) ? 1 : 0
      : explicitPreferenceMatch;
    const profileMoodBoost = input.profile?.preferredMoods?.length
      ? input.profile.preferredMoods.includes(quest.mood) ? 1 : 0
      : explicitPreferenceMatch;
    const preferenceMatch = (profileCategoryBoost + profileMoodBoost + explicitPreferenceMatch) / 3;

    const relationshipSimilarity =
      completedRelationshipSignals.sameJourneyTitles.length > 0 || completedRelationshipSignals.sameCollectionTitles.length > 0 ? 1 : 0;
    const relationshipPriority =
      (completedRelationshipSignals.sameJourneyTitles.length > 0 ? 2 : 0) +
      (completedRelationshipSignals.sameCollectionTitles.length > 0 ? 1 : 0);
    const categoryMoodSimilarity = completedQuests.length === 0
      ? 0.5
      : normalizeScore(
          (quest.categories.some((category) => completedCategorySet.has(category)) ? 0.85 : 0) +
          (completedMoodSet.has(quest.mood) ? 0.15 : 0)
        );
    const similarityToCompleted = Math.max(relationshipSimilarity, categoryMoodSimilarity);

    const seasonFit = quest.seasons.includes(currentSeason) ? 1 : 0.85;
    const budgetFit = input.profile?.maxCost ? normalizeScore(1 - Math.max(0, costRank[quest.cost] - costRank[input.profile.maxCost]) / 3) : 1;
    const priorAffinity = affinity.questWeights.get(quest.id) ?? 0;
    const noveltyBonus = priorAffinity === 0 ? 1 : priorAffinity < 4 ? 0.65 : 0.25;
    const popularitySignal = popularityScore(quest);

    return {
      quest,
      noveltyBonus,
      relationshipPriority,
      score:
        0.3 * preferenceMatch +
        0.35 * similarityToCompleted +
        0.15 * seasonFit +
        0.05 * budgetFit +
        0.1 * noveltyBonus +
        0.05 * popularitySignal
    };
  });

  const bestMatches = scored.slice().sort((a, b) => b.relationshipPriority - a.relationshipPriority || b.score - a.score);
  const bestMatchCount = Math.ceil(bestMatches.length * 0.8);
  const best = bestMatches.slice(0, bestMatchCount);
  const bestIds = new Set(best.map((item) => item.quest.id));
  const probes = scored
    .filter((item) => !bestIds.has(item.quest.id))
    .sort((a, b) => b.noveltyBonus - a.noveltyBonus || b.score - a.score);

  return [...best, ...probes].map((item) => item.quest);
}

function formatQuestList(quests: Quest[]) {
  return quests.slice(0, 3).map((quest) => quest.title).join(", ");
}

function getRelatedEventQuests(quest: Quest, questsById: Map<string, Quest>, events: QuestInterestEvent[], eventType: QuestInterestEvent["eventType"]) {
  const seenQuestIds = new Set<string>();

  return events
    .filter((event) => event.eventType === eventType && event.questId !== quest.id)
    .map((event) => questsById.get(event.questId))
    .filter((eventQuest): eventQuest is Quest => {
      if (!eventQuest || seenQuestIds.has(eventQuest.id)) return false;
      const isRelated = eventQuest.categories.some((category) => quest.categories.includes(category)) || eventQuest.mood === quest.mood;
      if (!isRelated) return false;
      seenQuestIds.add(eventQuest.id);
      return true;
    });
}

export function getQuestRecommendationReasons(input: QuestRecommendationReasonsInput): RecommendationReason[] {
  const currentSeason = getCurrentSeason();
  const contextQuests = input.allQuests ?? input.quests;
  const questsById = new Map(contextQuests.map((quest) => [quest.id, quest]));
  const completedQuests = contextQuests.filter((quest) => input.completedQuestIds.has(quest.id));
  const completedMatches = completedQuests.filter((completedQuest) =>
    completedQuest.id !== input.quest.id &&
    (completedQuest.categories.some((category) => input.quest.categories.includes(category)) || completedQuest.mood === input.quest.mood)
  );
  const completedRelationshipSignals = getCompletedRelationshipSignals(input.quest, input.completedQuestIds, input.journeys, input.collections);
  const reasons: RecommendationReason[] = [];

  if (completedRelationshipSignals.sameJourneyTitles.length > 0) {
    reasons.push({
      label: `You completed quests in the same journey: ${completedRelationshipSignals.sameJourneyTitles.slice(0, 2).join(", ")}`,
      importance: 0.35
    });
  }

  if (completedRelationshipSignals.sameCollectionTitles.length > 0) {
    reasons.push({
      label: `You completed quests in the same collection: ${completedRelationshipSignals.sameCollectionTitles.slice(0, 2).join(", ")}`,
      importance: 0.35
    });
  }

  if (completedMatches.length > 0) {
    reasons.push({
      label: `Similar to quests you completed: ${formatQuestList(completedMatches)}`,
      importance: 0.32
    });
  }

  const relatedEvents: Array<{ type: QuestInterestEvent["eventType"]; label: string; importance: number }> = [
    { type: "started", label: "You started related quests", importance: 0.3 },
    { type: "saved", label: "You saved related quests", importance: 0.28 },
    { type: "clicked", label: "You clicked related quests", importance: 0.22 },
    { type: "viewed", label: "You viewed related quests", importance: 0.14 }
  ];

  relatedEvents.forEach((eventReason) => {
    const matches = getRelatedEventQuests(input.quest, questsById, input.events ?? [], eventReason.type);
    if (matches.length > 0) {
      reasons.push({
        label: `${eventReason.label}: ${formatQuestList(matches)}`,
        importance: eventReason.importance
      });
    }
  });

  if (input.profile?.preferredCategories?.some((category) => input.quest.categories.includes(category))) {
    reasons.push({
      label: `Matches your category preferences: ${input.quest.categories.filter((category) => input.profile?.preferredCategories?.includes(category)).join(", ")}`,
      importance: 0.3
    });
  }

  if (input.profile?.preferredMoods?.includes(input.quest.mood)) {
    reasons.push({
      label: `Matches your ${input.quest.mood} mood preference`,
      importance: 0.3
    });
  }

  if (input.quest.seasons.includes(currentSeason)) {
    reasons.push({
      label: `Fits ${currentSeason.toLowerCase()} right now`,
      importance: 0.15
    });
  } else if (input.quest.seasons.includes("All year")) {
    reasons.push({
      label: "Works all year",
      importance: 0.13
    });
  }

  if (input.profile?.maxCost && costRank[input.quest.cost] <= costRank[input.profile.maxCost]) {
    reasons.push({
      label: "Within your budget",
      importance: 0.1
    });
  }

  if (input.profile?.maxDifficulty && difficultyRank[input.quest.difficulty] <= difficultyRank[input.profile.maxDifficulty]) {
    reasons.push({
      label: "Within your preferred difficulty",
      importance: 0.1
    });
  }

  if (!(input.events ?? []).some((event) => event.questId === input.quest.id)) {
    reasons.push({
      label: "Adds something new to your recommendations",
      importance: 0.1
    });
  }

  if (popularityScore(input.quest) > 0) {
    reasons.push({
      label: "Has a positive popularity signal",
      importance: 0.05
    });
  }

  if (reasons.length === 0) {
    reasons.push({
      label: "A broad match for your current filters",
      importance: 0.01
    });
  }

  return reasons.sort((a, b) => b.importance - a.importance);
}
