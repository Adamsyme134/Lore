import { View, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState, useMemo, useCallback } from "react";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { QuestHero } from "../../../src/features/quests/components/QuestHero";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
// ✨ We removed LoreEntryCard here
import { FriendMomentCard } from "../../../src/features/social/components/FriendMomentCard";
import { useQuests } from "../../../src/features/quests/api/questApi";
import { useFriendMoments } from "../../../src/features/social/api/socialApi"; // ✨ Added Friend API
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query"; // ✨ Added useQuery
import { requireSupabase } from "../../../src/lib/supabase";

export default function TodayScreen() {
  const { data: quests = [], isLoading: isLoadingQuests, refetch: refetchQuests } = useQuests();
  const { data: friendMoments = [], refetch: refetchFriendMoments } = useFriendMoments(); // ✨ Get actual friends
  const { profile, user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const previewPoints = useExperienceStore((state) => state.previewPoints);
  
  // ✨ NEW: Fetch the absolute truth of quest statuses from Supabase
  const { data: questStatuses, refetch: refetchQuestStatuses } = useQuery({
    queryKey: ['user-quests-status', user?.id],
    queryFn: async () => {
      if (!user) return { active: [], completed: [] };
      const { data } = await requireSupabase()
        .from('user_quests')
        .select('quest_id, status')
        .eq('user_id', user.id);
        
      return {
        active: data?.filter(d => d.status === 'active').map(d => d.quest_id) || [],
        completed: data?.filter(d => d.status === 'completed').map(d => d.quest_id) || []
      };
    },
    enabled: !!user
  });

  const points = profile?.pointsTotal ?? previewPoints;
  const currentLevel = Math.floor(points / 100) + 1;
  const nextLevel = currentLevel + 1;
  const progressToNextLevel = (points % 100) / 100;

  const [rerollsLeft, setRerollsLeft] = useState(3);
  const [mainQuestIndex, setMainQuestIndex] = useState(0);

  // ✨ NEW: Calculate exactly which quests go where based on Supabase truth
  const activeQuestIds = questStatuses?.active || [];
  const completedQuestIds = questStatuses?.completed || [];

  // In Progress = Only quests explicitly marked as "active"
  const inProgressQuests = useMemo(() => 
    quests.filter((q) => activeQuestIds.includes(q.id)),
  [quests, activeQuestIds]);

  // Unstarted = Quests that are NOT active AND NOT completed
  const unstartedQuests = useMemo(() => 
    quests.filter((q) => !activeQuestIds.includes(q.id) && !completedQuestIds.includes(q.id)),
  [quests, activeQuestIds, completedQuestIds]);

  const displayQuests = unstartedQuests.length > 0 ? unstartedQuests : quests;
  const todayQuest = displayQuests[mainQuestIndex % displayQuests.length];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchQuests(),
        refetchFriendMoments(),
        user ? refetchQuestStatuses() : Promise.resolve()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchFriendMoments, refetchQuestStatuses, refetchQuests, user]);


  const handleReroll = () => {
    if (rerollsLeft > 0) {
      setMainQuestIndex((prev) => prev + 1); 
      setRerollsLeft((prev) => prev - 1);
    }
  };

  if (isLoadingQuests && quests.length === 0) {
    return (
      <Screen contentClassName="flex-1 items-center justify-center">
        <ActivityIndicator color="#2c2a25" />
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
            tintColor="#2c2a25"
          />
        }
      >
        <AppText variant="title" className="mt-8 text-center text-ink/60">No quests available.</AppText>
      </Screen>
    );
  }

  return (
    <Screen
      contentClassName="pt-2"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#2c2a25"
        />
      }
    >
      
      {/* --- PAGE 1: HEADER & LEVEL BAR --- */}
      <View className="mb-6 flex-row items-center justify-between gap-4 px-5">
        <View className="flex-1 flex-row items-center gap-3">
          <AppText variant="body" className="font-sansBold text-ink">{currentLevel}</AppText>
          <View className="flex-1 h-3 rounded-full bg-line overflow-hidden">
            <View 
              className="h-full bg-ink rounded-full" 
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
      <View className="mb-8">
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
      </View>

      {/* --- PAGE 3: FRIEND'S LORE --- */}
      <View className="px-5 pb-32"> 
        <AppText variant="title" className="mb-6">
          Friend's Lore
        </AppText>
        
        {friendMoments.length > 0 ? (
          friendMoments.map((moment) => (
            <TouchableOpacity 
              key={moment.id} 
              onPress={() => router.push(`/lore/${moment.id}`)} 
              activeOpacity={0.9} 
              className="mb-6"
            >
              <FriendMomentCard moment={moment} />
            </TouchableOpacity>
          ))
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
