// app/(app)/(tabs)/explore.tsx
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { CategoryIconBadge } from "../../../src/features/quests/components/QuestMetadata";
import { CollectionCard } from "../../../src/features/quests/components/CollectionCard";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import {
  getExclusiveQuestLock,
  getJourneyLock,
  getJourneyQuestIds,
  getQuestCollectionLock,
  getSideQuestLock,
  isQuestCollectionComplete,
  useJourneys,
  useQuestCollections,
  useQuests,
  useRecordQuestInterestEvent,
  useSaveQuest,
  useUserQuestInterestEvents,
  useUserJourneyStatuses,
  useUserQuestStatuses
} from "../../../src/features/quests/api/questApi";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
import { recommendQuests } from "../../../src/features/quests/utils/recommendations";
import type { Journey, Quest, QuestCategory, QuestCost, QuestLength } from "../../../src/shared/types/domain";

const COSTS: (QuestCost | "All")[] = ["All", "Free", "£", "££", "£££"];
const LENGTHS: (QuestLength | "All")[] = ["All", "A few hours", "Full day", "Multi-day", "Long-term"];

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

function SectionTitle({ title, onActionPress }: { title: string; onActionPress?: () => void }) {
  return (
    <View className="mb-4 flex-row items-center justify-between px-5">
      <AppText variant="title" className="text-[22.1px] leading-[29px] text-ink">
        {title}
      </AppText>
      <Pressable onPress={onActionPress} className="flex-row items-center gap-1">
        <AppText className="text-xs text-muted">See all</AppText>
        <Ionicons name="chevron-forward" size={13} color="#807A70" />
      </Pressable>
    </View>
  );
}

function SmallQuestCard({
  quest,
  width,
  isSaved,
  onToggleSaved,
  onQuestPress
}: {
  quest: Quest;
  width: number;
  isSaved: boolean;
  onToggleSaved: (questId: string) => void;
  onQuestPress: (quest: Quest) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onQuestPress(quest)}
      activeOpacity={0.88}
      className="mr-4"
      style={{ width }}
    >
      <View
        style={{
          height: width,
          borderRadius: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 5
        }}
      >
        <View className="relative overflow-hidden rounded-[18px] bg-stone" style={{ height: width }}>
          <Image
            source={{ uri: quest.imageUrl }}
            style={{ height: "100%", width: "100%" }}
            contentFit="cover"
            contentPosition={contentPosition(quest.imagePosition) as any}
            transition={300}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.26)", "rgba(0,0,0,0.86)"]}
            locations={[0.38, 0.68, 1]}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <CategoryIconBadge category={quest.categories?.[0] || quest.category} className="absolute left-3 top-3" size="sm" />
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onToggleSaved(quest.id);
            }}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55"
          >
            <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} color="#F6F5F2" />
          </Pressable>
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <AppText variant="subtitle" className="text-ivory leading-7" numberOfLines={2}>
              {quest.title}
            </AppText>
          </View>
        </View>
      </View>
      <AppText className="mt-3 px-1 text-sm leading-5 text-ivory" numberOfLines={1}>
        {quest.duration} • {quest.cost} • {quest.difficulty}
      </AppText>
    </TouchableOpacity>
  );
}

function FeaturedQuest({ quest, width, onQuestPress }: { quest: Quest; width: number; onQuestPress: (quest: Quest) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onQuestPress(quest)}
      activeOpacity={0.88}
      className="mx-5 mb-7"
    >
      <View
        style={{
          height: Math.min(270, width * 0.529),
          borderRadius: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 5
        }}
      >
        <View className="relative overflow-hidden rounded-[18px] bg-stone" style={{ height: "100%" }}>
          <Image
            source={{ uri: quest.imageUrl }}
            style={{ height: "100%", width: "100%" }}
            contentFit="cover"
            contentPosition={contentPosition(quest.imagePosition) as any}
            transition={300}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.88)"]}
            locations={[0.28, 0.58, 1]}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View className="absolute inset-0 justify-end px-5 pb-5">
            <AppText className="mb-3 text-[8px] font-sansBold uppercase text-ivory/80" numberOfLines={1}>
              Featured Quest
            </AppText>
            <AppText variant="title" className="text-[25px] leading-[29px] text-ivory" numberOfLines={2}>
              {quest.title}
            </AppText>
            <View className="mt-3 flex-row items-center">
              <Ionicons name="location-outline" size={9.45} color="#F3F0EB" />
              <AppText className="ml-1 flex-1 text-[7.875px] text-ivory" numberOfLines={1}>
                {quest.locationHint}
              </AppText>
            </View>
            <View className="mt-5 flex-row items-center" style={{ columnGap: 19.6 }}>
              <View className="flex-row items-center rounded-full bg-black/35 px-2 py-1">
                <Ionicons name="calendar-outline" size={9.45} color="#F3F0EB" />
                <AppText className="ml-1 text-[7.875px] text-ivory" numberOfLines={1}>
                  {quest.duration}
                </AppText>
              </View>
              <View className="rounded-full bg-black/35 px-2 py-1">
                <AppText className="text-[7.875px] text-ivory" numberOfLines={1}>
                  {quest.cost}
                </AppText>
              </View>
              <View className="flex-row items-center rounded-full bg-black/35 px-2 py-1">
                <Ionicons name="stats-chart-outline" size={9.45} color="#F3F0EB" />
                <AppText className="ml-1 text-[7.875px] text-ivory" numberOfLines={1}>
                  {quest.difficulty}
                </AppText>
              </View>
            </View>
          </View>
          <Pressable className="absolute bottom-5 right-5 h-10 w-10 items-center justify-center rounded-full border border-ivory/25 bg-black/45">
            <Ionicons name="bookmark-outline" size={18} color="#F3F0EB" />
          </Pressable>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ContinueJourneyCard({
  journey,
  quests,
  completedQuestIds
}: {
  journey: Journey;
  quests: Quest[];
  completedQuestIds: Set<string>;
}) {
  const router = useRouter();
  const questIds = getJourneyQuestIds(journey);
  const totalCount = Math.max(questIds.length || journey.totalCount, 1);
  const completedCount = questIds.filter((questId) => completedQuestIds.has(questId)).length;
  const progress = Math.min(completedCount / totalCount, 1);
  const nextQuest = questIds.map((id) => quests.find((quest) => quest.id === id)).find((quest) => quest && !completedQuestIds.has(quest.id));
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: "/journey/[id]", params: { id: journey.id } })}
      className="mx-5 overflow-hidden rounded-xl border border-ivory/10 bg-[#09211D]"
      style={{ height: 135.24 }}
    >
      <Image
        source={{ uri: journey.backgroundImageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPosition(journey.imagePosition) as any}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.24)", "rgba(0,0,0,0.62)", "rgba(0,0,0,0.86)"]}
        locations={[0, 0.48, 1]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View className="absolute inset-0 justify-between px-6 pb-6 pt-5">
        <View className="flex-row items-end justify-between gap-4">
          <View className="flex-1">
            <AppText className="text-[9px] font-sansBold uppercase text-ivory/85" numberOfLines={1}>
              Continue your journey
            </AppText>
            <AppText variant="title" className="text-[26px] leading-8 text-ivory" numberOfLines={1}>
              {journey.title}
            </AppText>
            <View className="mt-5 h-1 overflow-hidden rounded-full bg-ivory/30" style={{ width: "50%" }}>
              <View className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
            </View>
            <AppText className="mt-2 text-[10px] text-ivory/75" style={{ transform: [{ translateY: -5 }] }} numberOfLines={1}>
              {Math.round(progress * 100)}% complete
            </AppText>
          </View>
          <View className="mb-2 max-w-[34%] flex-row items-center justify-end gap-4">
            <View className="flex-1">
              <AppText className="text-[10px] text-ivory/75" numberOfLines={1}>
                Next up
              </AppText>
              <AppText className="text-xs text-ivory" numberOfLines={1}>
                {nextQuest?.title || journey.nextQuestTitle}
              </AppText>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-full border border-ivory">
              <Ionicons name="chevron-forward" size={20} color="#F3F0EB" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function HorizontalQuestRail({
  quests,
  cardWidth,
  savedQuestIds,
  onToggleSaved,
  onQuestPress
}: {
  quests: Quest[];
  cardWidth: number;
  savedQuestIds: string[];
  onToggleSaved: (questId: string) => void;
  onQuestPress: (quest: Quest) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 24 }}>
      {quests.map((quest) => (
        <SmallQuestCard
          key={quest.id}
          quest={quest}
          width={cardWidth}
          isSaved={savedQuestIds.includes(quest.id)}
          onToggleSaved={onToggleSaved}
          onQuestPress={onQuestPress}
        />
      ))}
    </ScrollView>
  );
}

export default function Explore() {
  const router = useRouter();
  const colors = useThemeColors();
  const { profile } = useAuth();
  const { width, height } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeCost, setActiveCost] = useState<QuestCost | "All">("All");
  const [activeLength, setActiveLength] = useState<QuestLength | "All">("All");

  const { savedQuestIds, activeQuests } = useExperienceStore();
  const saveQuest = useSaveQuest();
  const recordQuestInterestEvent = useRecordQuestInterestEvent();
  const { data: quests = [], isLoading: isLoadingQuests } = useQuests();
  const { data: journeys = [], isLoading: isLoadingJourneys } = useJourneys();
  const { data: collections = [], isLoading: isLoadingCollections } = useQuestCollections();
  const { data: questStatuses } = useUserQuestStatuses();
  const { data: journeyStatuses } = useUserJourneyStatuses();
  const { data: questInterestEvents = [] } = useUserQuestInterestEvents();
  const { data: loreEntries = [] } = useLoreEntries();

  const activeQuestIds = useMemo(
    () => new Set([...(questStatuses?.active || []), ...Object.keys(activeQuests)]),
    [activeQuests, questStatuses?.active]
  );
  const completedQuestIds = useMemo(() => {
    const ids = new Set(questStatuses?.completed || []);
    loreEntries.forEach((entry) => {
      if (entry.questId) ids.add(entry.questId);
      entry.autoCompletedQuests?.forEach((quest) => ids.add(quest.id));
    });
    return ids;
  }, [loreEntries, questStatuses?.completed]);
  const completedJourneyIds = useMemo(() => new Set(journeyStatuses?.completed || []), [journeyStatuses?.completed]);
  const activeJourneyIds = useMemo(() => {
    const ids = new Set(journeyStatuses?.active || []);
    journeys.forEach((journey) => {
      if (getJourneyQuestIds(journey).some((questId) => completedQuestIds.has(questId))) ids.add(journey.id);
    });
    return ids;
  }, [completedQuestIds, journeyStatuses?.active, journeys]);
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const visibleQuests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return quests.filter((quest) => {
      if (activeQuestIds.has(quest.id)) return false;
      if (getExclusiveQuestLock(quest.id, journeys, completedQuestIds, activeJourneyIds)?.isLocked) return false;
      if (getSideQuestLock(quest, quests, completedQuestIds)?.isLocked) return false;
      const collectionUnlockers = collections.filter((collection) => (collection.unlockQuestIds || []).includes(quest.id));
      if (collectionUnlockers.length && !collectionUnlockers.some((collection) => isQuestCollectionComplete(collection, completedQuestIds))) return false;
      if (activeCost !== "All" && quest.cost !== activeCost) return false;
      if (activeLength !== "All" && quest.length !== activeLength) return false;
      if (!query) return true;
      return quest.title.toLowerCase().includes(query) || quest.description.toLowerCase().includes(query);
    });
  }, [activeCost, activeJourneyIds, activeLength, activeQuestIds, collections, completedQuestIds, journeys, quests, searchQuery]);
  const recommendedQuests = useMemo(
    () => recommendQuests({
      quests: visibleQuests,
      allQuests: quests,
      completedQuestIds,
      activeQuestIds,
      savedQuestIds: new Set(savedQuestIds),
      journeys,
      collections,
      events: questInterestEvents,
      profile,
      mode: "Recommended"
    }),
    [activeQuestIds, collections, completedQuestIds, journeys, profile, questInterestEvents, savedQuestIds, visibleQuests]
  );
  const handleQuestPress = (quest: Quest) => {
    recordQuestInterestEvent.mutate({ questId: quest.id, eventType: "clicked" });
    router.push({ pathname: "/quest/[id]", params: { id: quest.id } });
  };

  const visibleJourneys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return journeys.filter((journey) => {
      if (!journey.isActive) return false;
      if (getJourneyLock(journey, completedQuestIds, completedJourneyIds)?.isLocked) return false;
      const includedQuests = getJourneyQuestIds(journey).map((questId) => questById.get(questId)).filter(Boolean) as Quest[];
      if (activeCost !== "All" && !includedQuests.some((quest) => quest.cost === activeCost)) return false;
      if (activeLength !== "All" && !includedQuests.some((quest) => quest.length === activeLength)) return false;
      if (!query) return true;
      return journey.title.toLowerCase().includes(query) ||
        journey.description.toLowerCase().includes(query) ||
        includedQuests.some((quest) => quest.title.toLowerCase().includes(query) || quest.description.toLowerCase().includes(query));
    });
  }, [activeCost, activeLength, completedJourneyIds, completedQuestIds, journeys, questById, searchQuery]);

  const visibleCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return collections.filter((collection) => {
      if (!collection.isActive) return false;
      if (getQuestCollectionLock(collection, collections, completedQuestIds)?.isLocked) return false;
      const includedQuests = collection.questIds.map((questId) => questById.get(questId)).filter(Boolean) as Quest[];
      if (activeCost !== "All" && !includedQuests.some((quest) => quest.cost === activeCost)) return false;
      if (activeLength !== "All" && !includedQuests.some((quest) => quest.length === activeLength)) return false;
      if (!query) return true;
      return collection.title.toLowerCase().includes(query) ||
        (collection.description || "").toLowerCase().includes(query) ||
        includedQuests.some((quest) => quest.title.toLowerCase().includes(query) || quest.description.toLowerCase().includes(query));
    });
  }, [activeCost, activeLength, collections, completedQuestIds, questById, searchQuery]);

  const unlockedByCollections = useMemo(() => {
    const unlockedQuestIds = new Set(
      collections
        .filter((collection) => isQuestCollectionComplete(collection, completedQuestIds))
        .flatMap((collection) => collection.unlockQuestIds)
    );
    return visibleQuests.filter((quest) => unlockedQuestIds.has(quest.id));
  }, [collections, completedQuestIds, visibleQuests]);

  const featuredQuest = recommendedQuests.find((quest) => quest.categories?.includes("Adventure" as QuestCategory)) || recommendedQuests[0] || visibleQuests[0] || quests[0];
  const railQuestWidth = Math.min(176, Math.max(148, (width - 64) / 2.15)) * 1.1;
  const continueJourneys = useMemo(
    () => visibleJourneys
      .map((journey) => {
        const questIds = getJourneyQuestIds(journey);
        const totalCount = Math.max(questIds.length || journey.totalCount, 1);
        const completedCount = questIds.filter((questId) => completedQuestIds.has(questId)).length;
        return { journey, completedCount, progress: completedCount / totalCount };
      })
      .filter((item) => item.completedCount > 0)
      .sort((a, b) => b.progress - a.progress || b.completedCount - a.completedCount)
      .map((item) => item.journey),
    [completedQuestIds, visibleJourneys]
  );
  const collectionWidth = Math.min(255, Math.max(205, width * 0.43));
  const firstViewportPadding = Math.max(18, Math.min(34, height * 0.025));
  const isLoading = isLoadingQuests || isLoadingJourneys || isLoadingCollections;

  return (
    <Screen scroll={false}>
      <View className="flex-1 bg-background">
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 124, paddingTop: firstViewportPadding }}>
          <View className="mb-5 flex-row gap-3 px-6">
            <View className="flex-1 flex-row items-center rounded-full border border-ivory/25 bg-black px-5 py-3">
              <Ionicons name="search" size={21} color="#F3F0EB" />
              <TextInput
                className="ml-3 flex-1 font-sans text-ivory"
                placeholder="Search for quests...."
                placeholderTextColor="rgba(243,240,235,0.62)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <Pressable
              onPress={() => setShowFilters((value) => !value)}
              className="h-14 w-14 items-center justify-center rounded-full border border-ivory/20 bg-black"
            >
              <Ionicons name="options" size={22} color={showFilters ? colors.accent : "#F3F0EB"} />
            </Pressable>
          </View>

          {showFilters ? (
            <View className="mb-5">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 pl-6" contentContainerStyle={{ paddingRight: 24, gap: 8 }}>
                {COSTS.map((cost) => (
                  <Pressable
                    key={cost}
                    onPress={() => setActiveCost(cost)}
                    className={`rounded-full border px-4 py-2 ${activeCost === cost ? "border-accent bg-accent" : "border-ivory/20 bg-black/40"}`}
                  >
                    <AppText className={`text-xs ${activeCost === cost ? "font-sansSemi text-accentText" : "text-ivory"}`}>{cost}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 24, gap: 8 }}>
                {LENGTHS.map((length) => (
                  <Pressable
                    key={length}
                    onPress={() => setActiveLength(length)}
                    className={`rounded-full border px-4 py-2 ${activeLength === length ? "border-accent bg-accent" : "border-ivory/20 bg-black/40"}`}
                  >
                    <AppText className={`text-xs ${activeLength === length ? "font-sansSemi text-accentText" : "text-ivory"}`}>{length}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {isLoading && !featuredQuest ? (
            <View className="items-center justify-center py-24">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : featuredQuest ? (
            <FeaturedQuest quest={featuredQuest} width={width} onQuestPress={handleQuestPress} />
          ) : null}

          <View className="mb-6">
            <SectionTitle title={searchQuery ? "Search results" : "For You"} onActionPress={() => router.push("/quests")} />
            <HorizontalQuestRail quests={recommendedQuests} cardWidth={railQuestWidth} savedQuestIds={savedQuestIds} onToggleSaved={(questId) => saveQuest.mutate(questId)} onQuestPress={handleQuestPress} />
          </View>

          {continueJourneys[0] ? (
            <View className="mb-7">
              <ContinueJourneyCard journey={continueJourneys[0]} quests={quests} completedQuestIds={completedQuestIds} />
            </View>
          ) : null}

          <View className="mb-7">
            <SectionTitle title="Collections for you" onActionPress={() => router.push("/quests")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 24 }}>
              {visibleCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} quests={quests} completedQuestIds={completedQuestIds} width={collectionWidth} />
              ))}
            </ScrollView>
          </View>

          <View className="mb-8">
            <SectionTitle title={unlockedByCollections.length ? "Unlocked by your collections" : "Because you learnt to juggle"} onActionPress={() => router.push("/quests")} />
            <HorizontalQuestRail
              quests={(unlockedByCollections.length ? unlockedByCollections : visibleQuests.slice().reverse()).slice(0, 8)}
              cardWidth={railQuestWidth}
              savedQuestIds={savedQuestIds}
              onToggleSaved={(questId) => saveQuest.mutate(questId)}
              onQuestPress={handleQuestPress}
            />
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}
