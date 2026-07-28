import { View, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState, useMemo, useCallback } from "react";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { QuestHero } from "../../../src/features/quests/components/QuestHero";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { FriendLoreFeed } from "../../../src/features/social/components/FriendLoreFeed";
import { getExclusiveJourneyQuestIds, getJourneyQuestIds, useJourneys, useQuests, useUserJourneyStatuses, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import { useFriendMoments } from "../../../src/features/social/api/socialApi"; // ✨ Added Friend API
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { router } from "expo-router";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import type { Journey, Quest } from "../../../src/shared/types/domain";

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

function CompactJourneyCard({
  journey,
  questById,
  completedQuestIds
}: {
  journey: Journey;
  questById: Map<string, Quest>;
  completedQuestIds: Set<string>;
}) {
  const questIds = getJourneyQuestIds(journey);
  const completedCount = questIds.filter((questId) => completedQuestIds.has(questId)).length;
  const nextQuestId = questIds.find((questId) => !completedQuestIds.has(questId)) || questIds[0];
  const nextQuest = nextQuestId ? questById.get(nextQuestId) : null;

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/journey/[id]", params: { id: journey.id } })}
      className="relative overflow-hidden rounded-[24px] border border-accent/35 bg-stone"
      style={{ height: 160, width: 260 }}
    >
      <Image
        source={{ uri: journey.backgroundImageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPosition(journey.imagePosition) as any}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.86)"]}
        locations={[0.2, 1]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View className="absolute inset-0 justify-between p-4">
        <View className="h-9 w-9 items-center justify-center rounded-full border border-accent/35 bg-background/80">
          <Ionicons name={(journey.iconName as any) || "trail-sign-outline"} size={18} color="#F3F0EB" />
        </View>
        <View>
          <AppText variant="subtitle" className="text-ivory leading-7" numberOfLines={2}>
            {journey.title}
          </AppText>
          <AppText className="mt-1 text-xs text-ivory/75" numberOfLines={1}>
            {completedCount}/{questIds.length || journey.totalCount} experiences{nextQuest ? ` · Next: ${nextQuest.title}` : ""}
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TodayScreen() {
  const colors = useThemeColors();
  const { data: quests = [], isLoading: isLoadingQuests, refetch: refetchQuests } = useQuests();
  const { data: journeys = [], refetch: refetchJourneys } = useJourneys();
  const { data: friendMoments = [], refetch: refetchFriendMoments } = useFriendMoments(); // ✨ Get actual friends
  const { profile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const previewPoints = useExperienceStore((state) => state.previewPoints);
  const { data: questStatuses, refetch: refetchQuestStatuses } = useUserQuestStatuses();
  const { data: journeyStatuses, refetch: refetchJourneyStatuses } = useUserJourneyStatuses();

  const points = profile?.pointsTotal ?? previewPoints;
  const currentLevel = Math.floor(points / 100) + 1;
  const nextLevel = currentLevel + 1;
  const progressToNextLevel = (points % 100) / 100;

  const [rerollsLeft, setRerollsLeft] = useState(3);
  const [mainQuestIndex, setMainQuestIndex] = useState(0);

  // ✨ NEW: Calculate exactly which quests go where based on Supabase truth
  const activeQuestIds = questStatuses?.active || [];
  const completedQuestIds = questStatuses?.completed || [];
  const activeJourneyIds = journeyStatuses?.active || [];
  const exclusiveQuestIds = useMemo(() => getExclusiveJourneyQuestIds(journeys), [journeys]);
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const completedQuestIdSet = useMemo(() => new Set(completedQuestIds), [completedQuestIds]);

  // In Progress = Only quests explicitly marked as "active"
  const inProgressQuests = useMemo(() => 
    quests.filter((q) => activeQuestIds.includes(q.id)),
  [quests, activeQuestIds]);

  const inProgressJourneys = useMemo(
    () => journeys.filter((journey) => activeJourneyIds.includes(journey.id)),
    [activeJourneyIds, journeys]
  );

  // Unstarted = Quests that are NOT active AND NOT completed
  const unstartedQuests = useMemo(() => 
    quests.filter((q) => !exclusiveQuestIds.has(q.id) && !activeQuestIds.includes(q.id) && !completedQuestIds.includes(q.id)),
  [quests, activeQuestIds, completedQuestIds, exclusiveQuestIds]);

  const displayQuests = unstartedQuests.length > 0 ? unstartedQuests : quests.filter((quest) => !exclusiveQuestIds.has(quest.id));
  const todayQuest = displayQuests[mainQuestIndex % displayQuests.length];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchQuests(),
        refetchJourneys(),
        refetchFriendMoments(),
        refetchQuestStatuses(),
        refetchJourneyStatuses()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchFriendMoments, refetchJourneyStatuses, refetchQuests, refetchJourneys, refetchQuestStatuses]);


  const handleReroll = () => {
    if (rerollsLeft > 0) {
      setMainQuestIndex((prev) => prev + 1); 
      setRerollsLeft((prev) => prev - 1);
    }
  };

  if (isLoadingQuests && quests.length === 0) {
    return (
      <Screen contentClassName="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!todayQuest) {
    return (
      <Screen
        contentClassName="pt-3 px-5"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <AppText variant="title" className="mt-8 text-center text-muted">No quests available.</AppText>
      </Screen>
    );
  }

  return (
    <Screen
      contentClassName="pt-2 pb-0"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      
      {/* --- PAGE 1: HEADER & LEVEL BAR --- */}
      <View className="mb-6 flex-row items-center justify-between gap-4 px-5">
        <View className="flex-1 flex-row items-center gap-3">
          <AppText variant="body" className="font-sansBold text-ink">{currentLevel}</AppText>
          <View className="flex-1 h-3 rounded-full bg-line overflow-hidden">
            <View 
              className="h-full bg-accent rounded-full" 
              style={{ width: `${progressToNextLevel * 100}%` }} 
            />
          </View>
          <AppText variant="body" className="font-sansBold text-ink">{nextLevel}</AppText>
        </View>
        
        <TouchableOpacity 
          onPress={() => router.push("/profile")}
          className="h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
        >
          <AppText variant="caption" className="font-sansBold text-ink">
            {profile?.fullName?.[0] ?? "A"}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* --- PAGE 1: RECOMMENDED QUEST FOR TODAY --- */}
      <Animated.View entering={FadeInDown.delay(120).duration(420)} className="px-2 mb-10">
        <View className="items-center mb-4">
          <AppText variant="eyebrow" className="text-muted mb-2 uppercase tracking-widest text-center">
            Recommended Quest For Today
          </AppText>
        </View>
        
        <View className="rounded-[32px] border border-line bg-surface overflow-hidden shadow-sm shadow-charcoal/5">
          <QuestHero quest={todayQuest} className="rounded-none" variant="recommended" />
          
          {rerollsLeft > 0 && (
            <TouchableOpacity 
              onPress={handleReroll}
              className="w-full border-t border-line py-4 items-center bg-surface active:bg-line/30"
            >
              <AppText variant="caption" className="font-sansSemi text-ink">
                Different vibe ({rerollsLeft})
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* --- PAGE 2: IN PROGRESS HORIZONTAL SCROLL --- */}
      <View className="mb-8 pt-2">
        <View className="px-5 mb-4">
          <AppText variant="title">In Progress</AppText>
        </View>
        
        {inProgressQuests.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}
          >
            {inProgressQuests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} compact />
            ))}
          </ScrollView>
        ) : (
          <View className="px-5 py-2">
            <AppText className="text-muted font-sansMedium">No quests in progress</AppText>
          </View>
        )}

        <View className="mt-6 px-5 mb-4">
          <AppText variant="eyebrow" className="text-muted">Journeys</AppText>
        </View>
        {inProgressJourneys.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, gap: 12 }}
          >
            {inProgressJourneys.map((journey) => (
              <CompactJourneyCard
                key={journey.id}
                journey={journey}
                questById={questById}
                completedQuestIds={completedQuestIdSet}
              />
            ))}
          </ScrollView>
        ) : (
          <View className="px-5 py-2">
            <AppText className="text-muted font-sansMedium">No journeys in progress</AppText>
          </View>
        )}
      </View>

      {/* --- PAGE 3: FRIEND'S LORE --- */}
      <View className="-mx-5"> 
        <AppText variant="title" className="mb-6 px-5">
          Friend's Lore
        </AppText>
        
        {friendMoments.length > 0 ? (
          <FriendLoreFeed moments={friendMoments} />
        ) : (
          <AppText className="text-center text-muted mt-4">No recent lore from friends.</AppText>
        )}
        
        <View className="items-center py-6">
           <AppText className="text-muted font-sansBold tracking-widest">. . .</AppText>
        </View>
      </View>
    </Screen>
  );
}
