import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { TopBar } from "../../../src/shared/components/TopBar";
import { JourneyIcon } from "../../../src/features/quests/components/JourneyIcon";
import { getJourneyQuestIds, useJourneys, useQuests, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import type { QuestCategory, QuestCost, QuestLength } from "../../../src/shared/types/domain";

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

export default function JourneysIndexScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { data: journeys = [], isLoading } = useJourneys();
  const { data: quests = [] } = useQuests();
  const { data: questStatuses } = useUserQuestStatuses();
  const [contentWidth, setContentWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "For You" | "All" | "Saved">("For You");
  const [showFilters, setShowFilters] = useState(false);
  const [activeCost, setActiveCost] = useState<QuestCost | "All">("All");
  const [activeLength, setActiveLength] = useState<QuestLength | "All">("All");
  const gap = 12;
  const cardWidth = contentWidth;
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const completedQuestIds = useMemo(() => new Set(questStatuses?.completed || []), [questStatuses?.completed]);
  const filteredJourneys = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return journeys.filter((journey) => {
      if (!journey.isActive) return false;
      const includedQuests = getJourneyQuestIds(journey).map((questId) => questById.get(questId)).filter(Boolean);
      const matchesSearch =
        !query ||
        journey.title.toLowerCase().includes(query) ||
        journey.description.toLowerCase().includes(query) ||
        includedQuests.some((quest) => quest!.title.toLowerCase().includes(query) || quest!.description.toLowerCase().includes(query));
      const matchesCategory =
        activeCategory === "For You" ||
        activeCategory === "All" ||
        activeCategory === "Saved" ||
        includedQuests.some((quest) => quest!.categories?.includes(activeCategory as QuestCategory));
      const matchesCost = activeCost === "All" || includedQuests.some((quest) => quest!.cost === activeCost);
      const matchesLength = activeLength === "All" || includedQuests.some((quest) => quest!.length === activeLength);
      return matchesSearch && matchesCategory && matchesCost && matchesLength;
    });
  }, [activeCategory, activeCost, activeLength, journeys, questById, searchQuery]);

  return (
    <Screen contentClassName="px-5">
      <TopBar showBack title="Journeys" />
      <View className="mb-4">
        <View className="flex-row gap-3">
          <View className="flex-1 flex-row items-center rounded-full border border-line bg-surface px-5 py-3 shadow-sm">
            <Ionicons name="search" size={20} color={colors.textTertiary} />
            <TextInput
              className="ml-3 flex-1 font-sans text-ink"
              placeholder="Search Journeys..."
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-5 pl-5" contentContainerStyle={{ paddingRight: 40, gap: 12 }}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-5 pl-5" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 pl-5" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
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

      {isLoading ? (
        <ActivityIndicator className="mt-8" color={colors.accent} />
      ) : (
        <View className="flex-row flex-wrap" style={{ gap }} onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}>
          {contentWidth > 0 ? filteredJourneys.map((journey) => {
            const questIds = getJourneyQuestIds(journey);
            const completedCount = questIds.filter((questId) => completedQuestIds.has(questId)).length;
            const nextQuestId = questIds.find((questId) => !completedQuestIds.has(questId)) || questIds[0];
            const nextQuest = nextQuestId ? questById.get(nextQuestId) : null;

            return (
              <Pressable
                key={journey.id}
                onPress={() => router.push({ pathname: "/journey/[id]", params: { id: journey.id } })}
                className="overflow-hidden rounded-[18px] border border-accent/40 bg-surface"
                style={{ width: cardWidth, height: 300 }}
              >
                <Image
                  source={{ uri: journey.backgroundImageUrl }}
                  style={{ height: "100%", width: "100%" }}
                  contentFit="cover"
                  contentPosition={contentPosition(journey.imagePosition) as any}
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.82)"]}
                  locations={[0.25, 1]}
                  style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                />
                <View className="absolute inset-0 justify-between p-4">
                  <View className="h-11 w-11 items-center justify-center rounded-full border border-accent/40 bg-background/80">
                    <JourneyIcon name={journey.iconName} size={21} color="#F3F0EB" />
                  </View>
                  <View>
                    <AppText variant="subtitle" className="text-2xl leading-7 text-ivory" numberOfLines={2}>
                      {journey.title}
                    </AppText>
                    <AppText className="mt-2 text-xs text-ivory/80" numberOfLines={2}>
                      {completedCount} / {questIds.length || journey.totalCount} experiences
                    </AppText>
                    {nextQuest ? (
                      <AppText className="mt-2 text-xs text-ivory/75" numberOfLines={1}>
                        Next: {nextQuest.title}
                      </AppText>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          }) : null}
        </View>
      )}
    </Screen>
  );
}
