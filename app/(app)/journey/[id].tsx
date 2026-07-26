import { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { difficultyPillClass, difficultyPillTextClass, difficultyPillTextColor } from "../../../src/shared/components/Chip";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import { getJourneyQuestIds, useJourneys, useQuests, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import type { Quest } from "../../../src/shared/types/domain";

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

function JourneyTimeline({
  total,
  completedCount
}: {
  total: number;
  completedCount: number;
}) {
  const visibleTotal = Math.max(total, 1);

  return (
    <View className="mt-6">
      <AppText className="mb-4 font-sansSemi text-ivory/90">
        {completedCount} / {total} experiences completed
      </AppText>
      <View className="flex-row items-center">
        {Array.from({ length: visibleTotal }).slice(0, 8).map((_, index, visibleItems) => {
          const isComplete = index < completedCount;
          const isNext = index === completedCount;

          return (
            <View key={index} className="flex-1 flex-row items-center">
              <View
                className={`h-6 w-6 items-center justify-center rounded-full border ${
                  isComplete
                    ? "border-accent bg-accent"
                    : isNext
                      ? "border-accent bg-background/70"
                      : "border-ivory/55 bg-background/35"
                }`}
              >
                {isComplete ? <Ionicons name="checkmark" size={14} color="#183431" /> : null}
              </View>
              {index < visibleItems.length - 1 ? <View className="h-px flex-1 bg-ivory/45" /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function JourneyQuestRow({
  quest,
  index,
  isComplete,
  isNext,
  isLocked,
  total,
  onPress
}: {
  quest: Quest;
  index: number;
  isComplete: boolean;
  isNext: boolean;
  isLocked: boolean;
  total: number;
  onPress: () => void;
}) {
  return (
    <View className="mb-3 flex-row items-stretch">
      <View className="relative mr-3 w-10 items-center justify-center">
        {index > 0 ? <View className="absolute top-0 h-1/2 w-px bg-line" /> : null}
        {index < total - 1 ? <View className="absolute bottom-0 h-1/2 w-px bg-line" /> : null}
        <View
          className={`h-9 w-9 items-center justify-center rounded-full border ${
            isComplete ? "border-accent bg-accent" : "border-line bg-background"
          }`}
        >
          {isComplete ? (
            <Ionicons name="checkmark" size={18} color="#183431" />
          ) : (
            <AppText className="font-sansSemi text-ink/70">{index + 1}</AppText>
          )}
        </View>
      </View>
      <Pressable
        onPress={onPress}
        disabled={isLocked}
        className={`flex-1 overflow-hidden rounded-[12px] border ${
          isNext ? "border-accent" : "border-line/60"
        }`}
        style={{ height: 114 }}
      >
        <Image
          source={{ uri: quest.imageUrl }}
          style={{ height: "100%", width: "100%" }}
          contentFit="cover"
          contentPosition={contentPosition(quest.imagePosition) as any}
        />
        <LinearGradient
          colors={["rgba(7,20,18,0.18)", "rgba(7,20,18,0.72)", "rgba(7,20,18,0.94)"]}
          locations={[0, 0.52, 1]}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        {isLocked ? <View className="absolute inset-0 bg-black/35" /> : null}
        <View className="absolute inset-0 flex-row items-center px-4 py-3">
          <View className="flex-1 pr-3">
            <AppText variant="subtitle" className="text-xl leading-6 text-ivory" numberOfLines={2}>
              {quest.title}
            </AppText>
            <AppText className="mt-1 text-xs text-ivory/75" numberOfLines={1}>
              <Ionicons name="location-outline" size={11} color="#F3F0EB" /> {quest.locationHint}
            </AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {[...(quest.categories || []), quest.length, quest.difficulty].filter(Boolean).slice(0, 3).map((tag) => (
                <View key={tag} className={`rounded-full border px-2 py-0.5 ${difficultyPillClass(tag) || "border-ivory/20 bg-ivory/15"}`}>
                  <AppText className={`text-[8px] font-sansSemi ${difficultyPillTextClass(tag) || "text-ivory"}`} style={difficultyPillTextColor(tag) ? { color: difficultyPillTextColor(tag) } : undefined}>{tag}</AppText>
                </View>
              ))}
            </View>
          </View>
          {isNext && !isLocked ? (
            <View className="rounded-full bg-accent px-4 py-2">
              <AppText className="font-sansSemi text-accentText" style={{ color: "#183431" }}>Next up</AppText>
            </View>
          ) : isLocked ? (
            <Ionicons name="lock-closed-outline" size={24} color="#F3F0EB" />
          ) : (
            <Ionicons name="chevron-forward" size={22} color="#F3F0EB" />
          )}
        </View>
      </Pressable>
    </View>
  );
}

function isJourneyQuestLocked(index: number, questId: string, questIds: string[], completedQuestIds: Set<string>, isExclusive: boolean) {
  if (!isExclusive || index <= 0 || completedQuestIds.has(questId)) return false;
  return !completedQuestIds.has(questIds[index - 1]);
}

export default function JourneyDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: journeys = [], isLoading: isLoadingJourneys } = useJourneys();
  const { data: quests = [], isLoading: isLoadingQuests } = useQuests();
  const { data: questStatuses } = useUserQuestStatuses();

  const journey = journeys.find((item) => item.id === id || item.slug === id);
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const completedQuestIds = useMemo(() => new Set(questStatuses?.completed || []), [questStatuses?.completed]);
  const orderedQuestIds = useMemo(() => {
    if (!journey) return [];
    return getJourneyQuestIds(journey);
  }, [journey]);
  const orderedQuests = orderedQuestIds.map((questId) => questById.get(questId)).filter(Boolean) as Quest[];
  const completedCount = orderedQuestIds.filter((questId) => completedQuestIds.has(questId)).length;
  const nextQuestId = orderedQuestIds.find((questId) => !completedQuestIds.has(questId)) || orderedQuestIds[0];
  const isExclusive = journey?.visibility === "exclusive";

  if ((isLoadingJourneys || isLoadingQuests) && !journey) {
    return (
      <Screen scroll={false} contentClassName="items-center justify-center">
        <ActivityIndicator size="large" color={colors.accent} />
      </Screen>
    );
  }

  if (!journey) {
    return (
      <Screen contentClassName="px-5">
        <Pressable onPress={() => router.back()} className="mb-6 h-10 w-10 items-center justify-center rounded-full bg-surface">
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <AppText variant="title">Journey not found.</AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentClassName="px-0">
      <View
        className="absolute left-0 right-0 top-0 z-50 flex-row items-center justify-between px-5"
        style={{ paddingTop: Math.max(insets.top, 20) }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#1c1a17]/30"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </Pressable>
        <Pressable className="h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-[#1c1a17]/30">
          <Ionicons name="ellipsis-horizontal" size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="h-[460px] overflow-hidden">
          <Image
            source={{ uri: journey.backgroundImageUrl }}
            style={{ height: "100%", width: "100%" }}
            contentFit="cover"
            contentPosition={contentPosition(journey.imagePosition) as any}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.58)", "rgba(7,20,18,0.96)"]}
            locations={[0.18, 0.58, 1]}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View className="absolute bottom-0 left-0 right-0 px-6 pb-8">
            <View className="mb-5 h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-background/80">
              <Ionicons name={(journey.iconName as any) || "trail-sign-outline"} size={25} color="#F3F0EB" />
            </View>
            <AppText variant="display" className="text-ivory">
              {journey.title}
            </AppText>
            <AppText className="mt-2 text-xl leading-7 text-ivory/90">
              {journey.description}
            </AppText>
            <JourneyTimeline total={orderedQuestIds.length} completedCount={completedCount} />
          </View>
        </View>

        <View className="px-5 pt-7">
          <AppText variant="subtitle" className="mb-4 text-2xl text-ink">
            Your path
          </AppText>
          {orderedQuests.length === 0 ? (
            <View className="rounded-card border border-dashed border-line py-12">
              <AppText className="text-center text-muted">No quests have been added to this journey yet.</AppText>
            </View>
          ) : (
            orderedQuests.map((quest, index) => (
              <JourneyQuestRow
                key={quest.id}
                quest={quest}
                index={index}
                isComplete={completedQuestIds.has(quest.id)}
                isNext={quest.id === nextQuestId}
                isLocked={isJourneyQuestLocked(index, quest.id, orderedQuestIds, completedQuestIds, isExclusive)}
                total={orderedQuests.length}
                onPress={() => {
                  if (isJourneyQuestLocked(index, quest.id, orderedQuestIds, completedQuestIds, isExclusive)) return;
                  router.push({ pathname: "/quest/[id]", params: { id: quest.id } });
                }}
              />
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
