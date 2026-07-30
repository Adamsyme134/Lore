// app/(app)/(tabs)/explore.tsx
import { useState, useMemo } from "react";
import { View, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { CategoryIconBadge, QuestMetaPills } from "../../../src/features/quests/components/QuestMetadata";
import { JourneyTreeMap } from "../../../src/features/quests/components/JourneyTreeMap";
import { JourneyIcon } from "../../../src/features/quests/components/JourneyIcon";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import { getExclusiveJourneyQuestIds, getJourneyQuestIds, useJourneys, useQuests, useSaveQuest, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import type {
  Journey,
  Quest,
  QuestCategory,
  QuestCost,
  QuestLength
} from "../../../src/shared/types/domain";

const CATEGORIES: (QuestCategory | "For You" | "All" | "Saved")[] = [
  "For You",
  "All",
  "Saved",
  "Adventure",
  "Skill",
  "Culture",
  "Food & Drink",
  "Wellness",
  "Social"
];
const COSTS: (QuestCost | "All")[] = ["All", "Free", "£", "££", "£££"];
const LENGTHS: (QuestLength | "All")[] = ["All", "A few hours", "Full day", "Multi-day", "Long-term"];

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

function SectionTitle({ title, actionLabel, onActionPress }: { title: string; actionLabel?: string; onActionPress?: () => void }) {
  return (
    <View className="mb-4 flex-row items-center justify-between px-6">
      <AppText variant="subtitle" className="text-2xl text-ink">
        {title}
      </AppText>
      {actionLabel ? (
        <Pressable onPress={onActionPress} className="flex-row items-center gap-1">
          <AppText className="text-muted">{actionLabel}</AppText>
          <Ionicons name="chevron-forward" size={18} color="#B0B4B1" />
        </Pressable>
      ) : null}
    </View>
  );
}

function JourneyTimeline({
  items,
  completedCount
}: {
  items: Array<{ id: string; isComplete: boolean }>;
  completedCount: number;
}) {
  return (
    <View className="mt-5 flex-row items-center">
      {items.slice(0, 7).map((item, index, visibleItems) => {
        const isCurrent = index === completedCount;
        return (
          <View key={item.id} className="flex-1 flex-row items-center">
            <View
              className={`h-6 w-6 items-center justify-center rounded-full border ${
                item.isComplete ? "border-accent bg-accent" : isCurrent ? "border-accent bg-accent/80" : "border-ivory/60 bg-background/40"
              }`}
            >
              {item.isComplete ? <Ionicons name="checkmark" size={14} color="#183431" /> : null}
            </View>
            {index < visibleItems.length - 1 ? <View className="h-px flex-1 bg-ivory/45" /> : null}
          </View>
        );
      })}
    </View>
  );
}

function JourneyCard({
  journey,
  questById,
  completedQuestIds
}: {
  journey: Journey;
  questById: Map<string, Quest>;
  completedQuestIds: Set<string>;
}) {
  const router = useRouter();
  const orderedQuestIds = journey.questIds.length
    ? journey.questIds
    : journey.timeline.map((item) => item.questId).filter(Boolean) as string[];
  const timeline = orderedQuestIds.length
    ? orderedQuestIds.map((questId, index) => {
        const quest = questById.get(questId);
        const existingItem = journey.timeline.find((item) => item.questId === questId);
        return {
          id: `${journey.id}-${questId}`,
          questId,
          title: quest?.title || existingItem?.title || `Experience ${index + 1}`,
          isComplete: completedQuestIds.has(questId)
        };
      })
    : journey.timeline.map((item) => ({
        ...item,
        isComplete: item.questId ? completedQuestIds.has(item.questId) : item.isComplete
      }));
  const totalCount = orderedQuestIds.length || journey.totalCount;
  const completedCount = timeline.filter((item) => item.isComplete).length;
  const nextQuestId = timeline.find((item) => !item.isComplete && item.questId)?.questId || orderedQuestIds[0] || journey.nextQuestId;
  const nextQuest = nextQuestId ? questById.get(nextQuestId) : null;
  const nextQuestTitle = nextQuest?.title || journey.nextQuestTitle;
  const nextQuestImageUrl = nextQuest?.imageUrl || journey.nextQuestImageUrl;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/journey/[id]", params: { id: journey.id } })}
      className="mr-4 overflow-hidden rounded-[20px] border border-accent/40 bg-surface"
      style={{ width: 265, height: 450 }}
    >
      <Image
        source={{ uri: journey.backgroundImageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPosition(journey.imagePosition) as any}
        transition={300}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.14)", "rgba(0,0,0,0.72)", "rgba(7,20,18,0.95)"]}
        locations={[0, 0.5, 1]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="absolute inset-0 justify-between p-6">
        <View>
          <View className="mb-5 h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-background/80">
            <JourneyIcon name={journey.iconName} size={24} color="#F3F0EB" />
          </View>
          <AppText variant="title" className="text-ivory">
            {journey.title}
          </AppText>
          <AppText className="mt-2 text-base leading-5 text-ivory/85">
            {journey.description}
          </AppText>
          <JourneyTimeline items={timeline} completedCount={completedCount} />
          <AppText className="mt-3 text-ivory/80">
            {completedCount} / {totalCount} experiences
          </AppText>
        </View>

        <View>
          <AppText className="mb-3 text-ivory/85">Next up</AppText>
          <View className="flex-row items-center">
            <Image source={{ uri: nextQuestImageUrl }} className="mr-3 h-12 w-12 rounded-lg bg-stone" contentFit="cover" />
            <AppText className="flex-1 text-base leading-5 text-ivory">{nextQuestTitle}</AppText>
            <Ionicons name="chevron-forward" size={24} color="#B0B4B1" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CuratedQuestTile({
  quest,
  isSaved,
  onToggleSaved
}: {
  quest: Quest;
  isSaved: boolean;
  onToggleSaved: (questId: string) => void;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
      className="mr-4 overflow-hidden rounded-[18px] border border-line/25 bg-stone"
      style={{ width: 196, height: 286 }}
    >
      <Image
        source={{ uri: quest.imageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPosition(quest.imagePosition) as any}
        transition={300}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.86)"]}
        locations={[0.25, 1]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <CategoryIconBadge category={quest.categories?.[0] || quest.category} className="absolute left-3 top-3" size="sm" />
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onToggleSaved(quest.id);
        }}
        className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-xl border border-ivory/20 bg-background/70"
      >
        <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={22} color="#F3F0EB" />
      </Pressable>
      <View className="absolute bottom-0 left-0 right-0 p-5">
        <AppText variant="subtitle" className="mb-4 text-2xl leading-7 text-ivory">
          {quest.title}
        </AppText>
        <QuestMetaPills length={quest.length} difficulty={quest.difficulty} />
      </View>
    </Pressable>
  );
}

function RecommendedQuestCard({
  quest,
  isSaved,
  onToggleSaved
}: {
  quest: Quest;
  isSaved: boolean;
  onToggleSaved: (questId: string) => void;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
      className="mx-6 flex-row overflow-hidden rounded-[20px] border border-line/50 bg-surface"
      style={{ minHeight: 136 }}
    >
      <Image
        source={{ uri: quest.imageUrl }}
        style={{ width: 132, minHeight: 136 }}
        contentFit="cover"
        contentPosition={contentPosition(quest.imagePosition) as any}
      />
      <CategoryIconBadge category={quest.categories?.[0] || quest.category} className="absolute left-4 top-4" size="sm" />
      <View className="flex-1 p-5">
        <AppText className="mb-1 text-tertiary">You've enjoyed nature lately.</AppText>
        <AppText variant="subtitle" className="text-2xl leading-8 text-ink">
          {quest.title}
        </AppText>
        <QuestMetaPills length={quest.length} difficulty={quest.difficulty} tone="surface" className="mt-3" />
      </View>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onToggleSaved(quest.id);
        }}
        className="absolute right-4 top-4"
      >
        <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={26} color="#B0B4B1" />
      </Pressable>
    </Pressable>
  );
}

export default function Explore() {
  const router = useRouter();
  const colors = useThemeColors();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "For You" | "All" | "Saved">("For You");
  const [showFilters, setShowFilters] = useState(false);
  const [activeCost, setActiveCost] = useState<QuestCost | "All">("All");
  const [activeLength, setActiveLength] = useState<QuestLength | "All">("All");
  const [selectedJourneyNodeId, setSelectedJourneyNodeId] = useState<string | null>(null);

  const { savedQuestIds, activeQuests } = useExperienceStore();
  const saveQuest = useSaveQuest();
  const { data: quests = [], isLoading: isLoadingQuests } = useQuests();
  const { data: journeys = [], isLoading: isLoadingJourneys, isFetching: isFetchingJourneys } = useJourneys();
  const { data: questStatuses } = useUserQuestStatuses();

  const activeQuestIds = useMemo(
    () => new Set([...(questStatuses?.active || []), ...Object.keys(activeQuests)]),
    [activeQuests, questStatuses?.active]
  );
  const completedQuestIds = useMemo(() => new Set(questStatuses?.completed || []), [questStatuses?.completed]);
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const exclusiveQuestIds = useMemo(() => getExclusiveJourneyQuestIds(journeys), [journeys]);
  const journeyTreeProgress = useMemo(
    () => ({
      completedQuestIds,
      activeQuestIds
    }),
    [activeQuestIds, completedQuestIds]
  );

  const filteredQuests = useMemo(() => {
    return quests.filter((quest) => {
      const matchesSearch =
        quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quest.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (activeQuestIds.has(quest.id)) return false;
      if (exclusiveQuestIds.has(quest.id)) return false;

      if (activeCategory === "Saved") {
        return matchesSearch && savedQuestIds.includes(quest.id);
      }

      const safeCategories = quest.categories || (quest.category ? [quest.category] : ["Adventure"]);
      const matchesCategory =
        activeCategory === "For You" ||
        activeCategory === "All" ||
        safeCategories.includes(activeCategory as QuestCategory);
      const matchesCost = activeCost === "All" || quest.cost === activeCost;
      const matchesLength = activeLength === "All" || quest.length === activeLength;

      return matchesSearch && matchesCategory && matchesCost && matchesLength;
    });
  }, [activeCategory, activeCost, activeLength, activeQuestIds, exclusiveQuestIds, quests, savedQuestIds, searchQuery]);

  const filteredJourneys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return journeys.filter((journey) => {
      if (!journey.isActive) return false;

      const includedQuests = getJourneyQuestIds(journey)
        .map((questId) => questById.get(questId))
        .filter(Boolean) as Quest[];
      const matchesSearch =
        !query ||
        journey.title.toLowerCase().includes(query) ||
        journey.description.toLowerCase().includes(query) ||
        includedQuests.some(
          (quest) =>
            quest.title.toLowerCase().includes(query) ||
            quest.description.toLowerCase().includes(query)
        );

      if (activeCategory === "Saved") {
        return matchesSearch && includedQuests.some((quest) => savedQuestIds.includes(quest.id));
      }

      const matchesCategory =
        activeCategory === "For You" ||
        activeCategory === "All" ||
        includedQuests.some((quest) => {
          const safeCategories = quest.categories || (quest.category ? [quest.category] : ["Adventure"]);
          return safeCategories.includes(activeCategory as QuestCategory);
        });
      const matchesCost = activeCost === "All" || includedQuests.some((quest) => quest.cost === activeCost);
      const matchesLength = activeLength === "All" || includedQuests.some((quest) => quest.length === activeLength);

      return matchesSearch && matchesCategory && matchesCost && matchesLength;
    });
  }, [activeCategory, activeCost, activeLength, journeys, questById, savedQuestIds, searchQuery]);

  const recommendedQuest = useMemo(
    () =>
      filteredQuests.find((quest) => quest.categories?.includes("Adventure")) ||
      filteredQuests[0] ||
      quests.find((quest) => !activeQuestIds.has(quest.id)),
    [activeQuestIds, filteredQuests, quests]
  );

  const curatedTitle = searchQuery
    ? "Search Results"
    : activeCategory === "Saved"
      ? "Saved Quests"
      : activeCategory !== "For You" && activeCategory !== "All"
        ? `${activeCategory} Quests`
        : "Curated Quests";

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-6 pb-4 pt-6">
          <AppText variant="display" className="mb-6">
            Explore
          </AppText>
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center rounded-full border border-line bg-surface px-5 py-3 shadow-sm">
              <Ionicons name="search" size={20} color={colors.textTertiary} />
              <TextInput
                className="ml-3 flex-1 font-sans text-ink"
                placeholder="Search quests..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable
              onPress={() => setShowFilters(!showFilters)}
              className={`h-12 w-12 items-center justify-center rounded-full border shadow-sm ${showFilters ? "bg-accent border-accent" : "bg-surface border-line"}`}
            >
              <Ionicons name="options" size={20} color={showFilters ? colors.accentText : colors.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 pl-6" contentContainerStyle={{ paddingRight: 40, gap: 12 }}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`rounded-full border px-5 py-2.5 ${isActive ? "bg-accent border-accent" : "bg-transparent border-line"}`}
              >
                <AppText className={isActive ? "text-accentText font-sansSemi" : "text-ink"} style={isActive ? { color: "#183431" } : undefined}>{cat}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {showFilters && (
          <Animated.View entering={FadeInDown.duration(200)} className="mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 pl-6" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
              {COSTS.map((cost) => {
                const isActive = activeCost === cost;
                return (
                  <Pressable
                    key={cost}
                    onPress={() => setActiveCost(cost)}
                    className={`rounded-full border px-4 py-1.5 ${isActive ? "bg-elevated border-accent" : "bg-transparent border-line/40"}`}
                  >
                    <AppText variant="caption" className={isActive ? "text-ink font-sansSemi" : "text-muted"}>
                      {cost}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
              {LENGTHS.map((len) => {
                const isActive = activeLength === len;
                return (
                  <Pressable
                    key={len}
                    onPress={() => setActiveLength(len)}
                    className={`rounded-full border px-4 py-1.5 ${isActive ? "bg-elevated border-accent" : "bg-transparent border-line/40"}`}
                  >
                    <AppText variant="caption" className={isActive ? "text-ink font-sansSemi" : "text-muted"}>
                      {len}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        <View className="mb-9">
          <SectionTitle title={curatedTitle} actionLabel="See all" onActionPress={() => router.push("/quests")} />
          {isLoadingQuests && filteredQuests.length === 0 ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : filteredQuests.length === 0 ? (
            <View className="mx-6 items-center justify-center rounded-card border border-dashed border-line py-12">
              <AppText className="text-center text-muted">No quests found.</AppText>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 24 }}>
              {filteredQuests.map((quest) => (
                <CuratedQuestTile
                  key={quest.id}
                  quest={quest}
                  isSaved={savedQuestIds.includes(quest.id)}
                  onToggleSaved={(questId) => saveQuest.mutate(questId)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="mb-8">
          <SectionTitle title="Journey Tree" />
          {(isLoadingJourneys || isFetchingJourneys) && filteredJourneys.length === 0 ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : filteredJourneys.length === 0 ? (
            <View className="mx-6 items-center justify-center rounded-card border border-dashed border-line py-12">
              <AppText className="text-center text-muted">No journeys found.</AppText>
            </View>
          ) : (
            <View className="mx-0 overflow-hidden">
              <JourneyTreeMap
                journeys={filteredJourneys}
                quests={quests}
                progress={journeyTreeProgress}
                selectedNodeId={selectedJourneyNodeId}
                onSelectNode={(node) => setSelectedJourneyNodeId(node.id)}
                onDeselectNode={() => setSelectedJourneyNodeId(null)}
                onQuestPress={(quest) => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
                height={520}
              />
            </View>
          )}
        </View>

        <View className="mb-8">
          <SectionTitle title="Explore Journeys" actionLabel="See all" onActionPress={() => router.push("/journeys")} />
          {(isLoadingJourneys || isFetchingJourneys) && filteredJourneys.length === 0 ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : filteredJourneys.length === 0 ? (
            <View className="mx-6 items-center justify-center rounded-card border border-dashed border-line py-12">
              <AppText className="text-center text-muted">No journeys found.</AppText>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 24 }}>
              {filteredJourneys.map((journey) => (
                <JourneyCard key={journey.id} journey={journey} questById={questById} completedQuestIds={completedQuestIds} />
              ))}
            </ScrollView>
          )}
        </View>

        {recommendedQuest ? (
          <View className="mb-8">
            <View className="mb-4 flex-row items-center justify-between px-6">
              <AppText variant="subtitle" className="text-2xl text-ink">
                Because you're exploring
              </AppText>
              <View className="flex-row items-center gap-2">
                <AppText className="text-muted">Recommended next steps</AppText>
                <Ionicons name="sparkles" size={14} color={colors.textTertiary} />
              </View>
            </View>
            <RecommendedQuestCard
              quest={recommendedQuest}
              isSaved={savedQuestIds.includes(recommendedQuest.id)}
              onToggleSaved={(questId) => saveQuest.mutate(questId)}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
