import { View, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState, useMemo, useCallback } from "react";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { FriendLoreFeed } from "../../../src/features/social/components/FriendLoreFeed";
import { getJourneyQuestIds, useJourneys, useQuests, useUserJourneyStatuses, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import { useFriendMoments } from "../../../src/features/social/api/socialApi"; // ✨ Added Friend API
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { ExperienceProgressCard } from "../../../src/features/points/components/ExperienceProgressCard";
import { JourneyIcon } from "../../../src/features/quests/components/JourneyIcon";
import { CategoryIconBadge } from "../../../src/features/quests/components/QuestMetadata";
import { router } from "expo-router";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
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
          <JourneyIcon name={journey.iconName} size={18} color="#F3F0EB" />
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

function TodayQuestProgressCard({
  quest,
  completedStepIndexes,
  width
}: {
  quest: Quest;
  completedStepIndexes: number[];
  width: number;
}) {
  const totalSteps = Math.max(quest.steps.length, 1);
  const completedSteps = new Set(
    completedStepIndexes.filter((stepIndex) => stepIndex >= 0 && stepIndex < quest.steps.length)
  ).size;
  const progress = Math.min(completedSteps / totalSteps, 1);
  const posMatch = quest.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPos = posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (quest.imagePosition || "center");

  return (
    <View style={{ width }}>
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
        activeOpacity={0.86}
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
              contentPosition={contentPos as any}
              transition={300}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.26)", "rgba(0,0,0,0.86)"]}
              locations={[0.38, 0.68, 1]}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            />
            <CategoryIconBadge category={quest.categories?.[0] || quest.category} className="absolute left-3 top-3" size="sm" />
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-4">
              <AppText variant="subtitle" className="text-ivory leading-7" numberOfLines={2}>
                {quest.title}
              </AppText>
              <View className="relative mt-3 h-2 overflow-hidden rounded-full bg-ivory/30">
                <View className="h-full rounded-full bg-[#FFE0A3]" style={{ width: `${progress * 100}%` }} />
              </View>
            </View>
          </View>
        </View>
        <AppText className="mt-3 px-1 text-sm leading-5 text-ivory" numberOfLines={1}>
          {quest.duration} • {quest.cost} • {quest.difficulty}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

export default function TodayScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const { data: quests = [], isLoading: isLoadingQuests, refetch: refetchQuests } = useQuests();
  const { data: journeys = [], refetch: refetchJourneys } = useJourneys();
  const { data: friendMoments = [], refetch: refetchFriendMoments } = useFriendMoments(); // ✨ Get actual friends
  const { profile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const previewPoints = useExperienceStore((state) => state.previewPoints);
  const { data: questStatuses, refetch: refetchQuestStatuses } = useUserQuestStatuses();
  const { data: journeyStatuses, refetch: refetchJourneyStatuses } = useUserJourneyStatuses();
  const { data: loreEntries = [] } = useLoreEntries();

  const points = profile?.pointsTotal ?? previewPoints;

  // ✨ NEW: Calculate exactly which quests go where based on Supabase truth
  const activeQuestIds = questStatuses?.active || [];
  const activeJourneyIds = journeyStatuses?.active || [];
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const completedQuestIdSet = useMemo(() => {
    const ids = new Set(questStatuses?.completed || []);
    loreEntries.forEach((entry) => {
      if (entry.questId) ids.add(entry.questId);
      entry.autoCompletedQuests?.forEach((quest) => ids.add(quest.id));
    });
    return ids;
  }, [loreEntries, questStatuses?.completed]);
  const inProgressTileSize = Math.min(176, Math.max(148, (width - 64) / 2.15)) * 1.1;

  // In Progress = Only quests explicitly marked as "active"
  const inProgressQuests = useMemo(() => 
    quests.filter((q) => activeQuestIds.includes(q.id)),
  [quests, activeQuestIds]);

  const inProgressJourneys = useMemo(
    () => journeys.filter((journey) =>
      activeJourneyIds.includes(journey.id) ||
      getJourneyQuestIds(journey).some((questId) => completedQuestIdSet.has(questId))
    ),
    [activeJourneyIds, completedQuestIdSet, journeys]
  );

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


  if (isLoadingQuests && quests.length === 0) {
    return (
      <Screen contentClassName="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accent} />
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
      <View className="mb-3 px-0">
        <ExperienceProgressCard
          points={points}
          profileImageUrl={profile?.avatarUrl}
          profileInitial={profile?.fullName?.[0] ?? "A"}
          onProfilePress={() => router.push("/profile")}
        />
      </View>

      <Animated.View entering={FadeInDown.delay(120).duration(420)} className="mb-8 pt-1">
        <View className="mb-4" style={{ paddingLeft: 10, paddingRight: 20 }}>
          <AppText variant="title">In Progress</AppText>
        </View>
        
        {inProgressQuests.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 10, paddingRight: 20, gap: 12 }}
          >
            {inProgressQuests.map((quest) => (
              <TodayQuestProgressCard
                key={quest.id}
                quest={quest}
                width={inProgressTileSize}
                completedStepIndexes={questStatuses?.completedStepIndexesByQuestId[quest.id] ?? []}
              />
            ))}
          </ScrollView>
        ) : (
          <View className="py-2" style={{ paddingLeft: 10, paddingRight: 20 }}>
            <AppText className="text-muted font-sansMedium">No quests in progress</AppText>
          </View>
        )}

        <View className="mt-6 mb-4" style={{ paddingLeft: 10, paddingRight: 20 }}>
          <AppText variant="eyebrow" className="text-muted">Journeys</AppText>
        </View>
        {inProgressJourneys.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 10, paddingRight: 20, gap: 12 }}
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
          <View className="py-2" style={{ paddingLeft: 10, paddingRight: 20 }}>
            <AppText className="text-muted font-sansMedium">No journeys in progress</AppText>
          </View>
        )}
      </Animated.View>

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
