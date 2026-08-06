import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { getExclusiveQuestLock, getJourneyQuestIds, getSideQuestLock, useJourneys, useQuestCollections, useQuests, useRecordQuestInterestEvent, useUserQuestInterestEvents, useUserJourneyStatuses, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
import { RECOMMENDATION_COPY, RECOMMENDATION_MODES, recommendQuests, type RecommendationMode } from "../../../src/features/quests/utils/recommendations";
import type { QuestCategory, QuestCost, QuestLength } from "../../../src/shared/types/domain";

const QUICK_FILTERS: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  category?: QuestCategory | "For You" | "All";
  cost?: QuestCost | "All";
  length?: QuestLength | "All";
}> = [
  { label: "All", icon: "compass-outline", category: "All" },
  { label: "Outdoor", icon: "trail-sign-outline", category: "Adventure" },
  { label: "Food", icon: "restaurant-outline", category: "Food & Drink" },
  { label: "Creative", icon: "sparkles-outline", category: "Skill" },
  { label: "Weekend", icon: "calendar-outline", length: "Full day" },
  { label: "Free", icon: "pricetag-outline", cost: "Free" },
  { label: "Nearby", icon: "navigate-outline", category: "For You" }
];

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

function isQuickFilterActive(
  filter: (typeof QUICK_FILTERS)[number],
  activeCategory: QuestCategory | "For You" | "All" | "Saved",
  activeCost: QuestCost | "All",
  activeLength: QuestLength | "All"
) {
  if (filter.category) return activeCategory === filter.category;
  if (filter.cost) return activeCost === filter.cost;
  if (filter.length) return activeLength === filter.length;
  return false;
}

export default function QuestsIndexScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { profile } = useAuth();
  const { data: quests = [], isLoading } = useQuests();
  const { data: journeys = [] } = useJourneys();
  const { data: collections = [] } = useQuestCollections();
  const { data: questStatuses } = useUserQuestStatuses();
  const { data: journeyStatuses } = useUserJourneyStatuses();
  const { data: questInterestEvents = [] } = useUserQuestInterestEvents();
  const { data: loreEntries = [] } = useLoreEntries();
  const recordQuestInterestEvent = useRecordQuestInterestEvent();
  const { activeQuests, savedQuestIds } = useExperienceStore();
  const [contentWidth, setContentWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "For You" | "All" | "Saved">("All");
  const [activeCost, setActiveCost] = useState<QuestCost | "All">("All");
  const [activeLength, setActiveLength] = useState<QuestLength | "All">("All");
  const [recommendationMode, setRecommendationMode] = useState<RecommendationMode>("Recommended");
  const [isRecommendationMenuOpen, setIsRecommendationMenuOpen] = useState(false);
  const recommendationCopy = RECOMMENDATION_COPY[recommendationMode];
  const gap = 14;
  const cardWidth = contentWidth > 0 ? (contentWidth - gap) / 2 : 0;
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
  const activeJourneyIds = useMemo(() => {
    const ids = new Set(journeyStatuses?.active || []);
    journeys.forEach((journey) => {
      if (getJourneyQuestIds(journey).some((questId) => completedQuestIds.has(questId))) ids.add(journey.id);
    });
    return ids;
  }, [completedQuestIds, journeyStatuses?.active, journeys]);
  const availableQuests = useMemo(() => {
    const filteredQuests = quests.filter((quest) => {
      const matchesSearch =
        quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quest.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (activeQuestIds.has(quest.id)) return false;
      if (getExclusiveQuestLock(quest.id, journeys, completedQuestIds, activeJourneyIds)?.isLocked) return false;
      if (getSideQuestLock(quest, quests, completedQuestIds)?.isLocked) return false;

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
    return recommendQuests({
      quests: filteredQuests,
      allQuests: quests,
      completedQuestIds,
      activeQuestIds,
      savedQuestIds: new Set(savedQuestIds),
      journeys,
      collections,
      events: questInterestEvents,
      profile,
      mode: recommendationMode
    });
  }, [activeCategory, activeCost, activeJourneyIds, activeLength, activeQuestIds, collections, completedQuestIds, journeys, profile, questInterestEvents, quests, recommendationMode, savedQuestIds, searchQuery]);
  return (
    <Screen className="bg-background" contentClassName="px-[14px] pb-36">
      <View className="mb-8 flex-row items-center">
        <Pressable onPress={() => router.back()} className="-ml-2 mr-2 h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={28} color="#F3F0EB" />
        </Pressable>
        <AppText className="text-lg font-sansSemi text-ivory">For You</AppText>
      </View>

      <View className="mb-7 flex-row items-start justify-between gap-5">
        <View className="flex-1">
          <AppText variant="title" className="text-[24.565px] leading-[28.9px] text-ivory">
            {recommendationCopy.title}
          </AppText>
          <AppText className="mt-3 text-ivory/70" style={{ fontSize: 11.56, lineHeight: 17.34 }}>
            {recommendationCopy.description}
          </AppText>
        </View>
        <View className="relative z-50" style={{ elevation: 20 }}>
          <Pressable
            onPress={() => setIsRecommendationMenuOpen((value) => !value)}
            className="mt-1 flex-row items-center rounded-[9px] border border-ivory/25 px-[9.826px] py-[7.3695px]"
            style={{ width: 118 }}
          >
            <AppText className="flex-1 font-sansSemi text-ivory" style={{ fontSize: 9.826 }} numberOfLines={1}>{recommendationMode}</AppText>
            <Ionicons name="chevron-down" size={9.826} color="#F3F0EB" style={{ marginLeft: 4.913 }} />
          </Pressable>
          {isRecommendationMenuOpen ? (
            <View className="absolute right-0 top-9 z-50 w-36 overflow-hidden rounded-[10px] border border-ivory/20" style={{ backgroundColor: "#071412", elevation: 20 }}>
              {RECOMMENDATION_MODES.map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setRecommendationMode(mode);
                    setIsRecommendationMenuOpen(false);
                  }}
                  className={`px-3 py-2 ${recommendationMode === mode ? "bg-ivory/10" : ""}`}
                >
                  <AppText className="font-sansSemi text-ivory" style={{ fontSize: 10 }} numberOfLines={1}>
                    {mode}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View className="mb-5 flex-row gap-3">
        <View className="h-[51.2px] flex-1 flex-row items-center rounded-full border border-ivory/20 bg-black/20 px-4">
          <Ionicons name="search" size={19.2} color="#F3F0EB" />
          <TextInput
            className="ml-[12.8px] flex-1 font-sans text-ivory"
            style={{ fontSize: 12.8 }}
            placeholder="Search adventures, places, activities..."
            placeholderTextColor="rgba(243,240,235,0.55)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable className="h-[51.2px] w-[51.2px] items-center justify-center rounded-full border border-ivory/20 bg-black/20">
          <Ionicons name="options-outline" size={22.4} color="#F3F0EB" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 -mx-[14px] pl-[14px]" contentContainerStyle={{ paddingRight: 40, gap: 12 }}>
        {QUICK_FILTERS.map((filter) => {
          const isActive = isQuickFilterActive(filter, activeCategory, activeCost, activeLength);
          return (
            <Pressable
              key={filter.label}
              onPress={() => {
                setActiveCategory(filter.category ?? "For You");
                setActiveCost(filter.cost ?? "All");
                setActiveLength(filter.length ?? "All");
              }}
              className={`flex-row items-center rounded-full border px-[17px] py-[10.2px] ${isActive ? "border-ivory bg-ivory" : "border-ivory/20 bg-transparent"}`}
            >
              <Ionicons name={filter.icon} size={15.3} color={isActive ? "#171612" : "#F3F0EB"} />
              <AppText className={`ml-[6.8px] font-sansSemi ${isActive ? "text-ink" : "text-ivory"}`} style={{ fontSize: 13.6 }}>
                {filter.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <AppText className="mb-5 text-sm text-ivory/70">
        {availableQuests.length} adventures
      </AppText>

      {isLoading ? (
        <ActivityIndicator className="mt-8" color={colors.accent} />
      ) : (
        <View className="flex-row flex-wrap" style={{ columnGap: gap, rowGap: gap }} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
          {contentWidth > 0 ? availableQuests.map((quest) => {
              return (
                <Pressable
                  key={quest.id}
                  onPress={() => {
                    recordQuestInterestEvent.mutate({ questId: quest.id, eventType: "clicked" });
                    router.push({ pathname: "/quest/[id]", params: { id: quest.id } });
                  }}
                  className="overflow-hidden rounded-[14px] border border-ivory/15 bg-stone"
                  style={{ width: cardWidth, height: cardWidth }}
                >
                  <Image
                    source={{ uri: quest.imageUrl }}
                    style={{ height: "100%", width: "100%" }}
                    contentFit="cover"
                    contentPosition={contentPosition(quest.imagePosition) as any}
                  />
                  <LinearGradient
                    colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.32)", "rgba(0,0,0,0.88)"]}
                    locations={[0.3, 0.62, 1]}
                    style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                  />
                  <View className="absolute right-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-black/55">
                    <Ionicons name={savedQuestIds.includes(quest.id) ? "bookmark" : "bookmark-outline"} size={22} color="#F3F0EB" />
                  </View>
                  <View className="absolute bottom-0 left-0 right-0 p-5">
                    <View className="mt-2 flex-row items-center">
                      <Ionicons name="location-outline" size={13} color="#F3F0EB" />
                      <AppText className="ml-1 flex-1 text-xs font-sansSemi text-ivory" numberOfLines={1}>
                        {quest.locationHint}
                      </AppText>
                    </View>
                    <AppText variant="title" className="mt-3 text-[24px] leading-7 text-ivory" numberOfLines={2}>
                      {quest.title}
                    </AppText>
                    <AppText className="mt-2 text-sm text-ivory/78" numberOfLines={1}>
                      {quest.duration}  •  {quest.cost}  •  {quest.difficulty}
                    </AppText>
                  </View>
                </Pressable>
              );
          }) : null}
        </View>
      )}

      <View className="mt-8 flex-row items-center rounded-[14px] border border-ivory/10 bg-surface/40 px-3 py-3">
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-full border border-ivory/15">
          <Ionicons name="compass-outline" size={16} color="#F3F0EB" />
        </View>
        <View className="flex-1">
          <AppText className="font-sansSemi text-ivory" style={{ fontSize: 11.5, lineHeight: 15 }} numberOfLines={1}>
            You've explored today's recommendations.
          </AppText>
          <AppText className="mt-0.5 text-ivory/65" style={{ fontSize: 10.2, lineHeight: 14 }} numberOfLines={1}>
            Check back tomorrow for new ideas.
          </AppText>
        </View>
        <Pressable className="ml-3 flex-row items-center rounded-[8px] bg-ivory px-3 py-2">
          <Ionicons name="sparkles" size={12} color="#171612" />
          <AppText className="ml-1.5 font-sansSemi text-ink" style={{ fontSize: 10.5 }} numberOfLines={1}>Surprise me</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}
