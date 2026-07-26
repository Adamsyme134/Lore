import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { difficultyPillClass, difficultyPillTextClass, difficultyPillTextColor } from "../../../src/shared/components/Chip";
import { TopBar } from "../../../src/shared/components/TopBar";
import { getExclusiveJourneyQuestIds, useJourneys, useQuests, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
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

export default function QuestsIndexScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { data: quests = [], isLoading } = useQuests();
  const { data: journeys = [] } = useJourneys();
  const { data: questStatuses } = useUserQuestStatuses();
  const { activeQuests, savedQuestIds } = useExperienceStore();
  const [contentWidth, setContentWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "For You" | "All" | "Saved">("For You");
  const [showFilters, setShowFilters] = useState(false);
  const [activeCost, setActiveCost] = useState<QuestCost | "All">("All");
  const [activeLength, setActiveLength] = useState<QuestLength | "All">("All");
  const gap = 8;
  const cardWidth = contentWidth > 0 ? (contentWidth - gap) / 2 : 0;
  const exclusiveQuestIds = useMemo(() => getExclusiveJourneyQuestIds(journeys), [journeys]);
  const activeQuestIds = useMemo(
    () => new Set([...(questStatuses?.active || []), ...Object.keys(activeQuests)]),
    [activeQuests, questStatuses?.active]
  );
  const availableQuests = useMemo(() => {
    return quests.filter((quest) => {
      const matchesSearch =
        quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quest.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (exclusiveQuestIds.has(quest.id)) return false;
      if (activeQuestIds.has(quest.id)) return false;

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

  return (
    <Screen contentClassName="px-5">
      <TopBar showBack title="Quests" />
      <View className="mb-4">
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
          {contentWidth > 0 ? availableQuests.map((quest) => (
            <Pressable
              key={quest.id}
              onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
              className="overflow-hidden rounded-[14px] border border-line/30 bg-stone"
              style={{ width: cardWidth, height: 220 }}
            >
              <Image
                source={{ uri: quest.imageUrl }}
                style={{ height: "100%", width: "100%" }}
                contentFit="cover"
                contentPosition={contentPosition(quest.imagePosition) as any}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.86)"]}
                locations={[0.25, 1]}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
              />
              <View className="absolute bottom-0 left-0 right-0 p-3">
                <AppText variant="subtitle" className="text-base leading-5 text-ivory" numberOfLines={3}>
                  {quest.title}
                </AppText>
                <View className="mt-2 flex-row items-center">
                  <Ionicons name="location-outline" size={10} color="#F3F0EB" />
                  <AppText className="ml-1 flex-1 text-[10px] text-ivory/75" numberOfLines={1}>
                    {quest.locationHint}
                  </AppText>
                </View>
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {[...(quest.categories || []), quest.length, quest.difficulty].filter(Boolean).slice(0, 3).map((tag) => (
                    <View key={tag} className={`rounded-full border px-2 py-1 ${difficultyPillClass(tag) || "border-ivory/20 bg-ivory/15"}`}>
                      <AppText className={`text-[9px] font-sansSemi ${difficultyPillTextClass(tag) || "text-ivory"}`} style={difficultyPillTextColor(tag) ? { color: difficultyPillTextColor(tag) } : undefined} numberOfLines={1}>{tag}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            </Pressable>
          )) : null}
        </View>
      )}
    </Screen>
  );
}
