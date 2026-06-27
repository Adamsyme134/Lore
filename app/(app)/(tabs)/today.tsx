import { View, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useState } from "react";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { QuestHero } from "../../../src/features/quests/components/QuestHero";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { LoreEntryCard } from "../../../src/features/lore/components/LoreEntryCard";
import { useQuests } from "../../../src/features/quests/api/questApi";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { router } from "expo-router";

export default function TodayScreen() {
  const { data: quests = [], isLoading: isLoadingQuests } = useQuests();
  const { data: loreEntries = [] } = useLoreEntries();
  const { profile } = useAuth();

  const previewPoints = useExperienceStore((state) => state.previewPoints);
  const activeQuestsMap = useExperienceStore((state) => state.activeQuests); // ✨ Load active store
  
  const points = profile?.pointsTotal ?? previewPoints;
  const currentLevel = Math.floor(points / 100) + 1;
  const nextLevel = currentLevel + 1;
  const progressToNextLevel = (points % 100) / 100;

  const [rerollsLeft, setRerollsLeft] = useState(3);
  const [mainQuestIndex, setMainQuestIndex] = useState(0);

  // ✨ FIX 2: Correctly identify which quests are genuinely In Progress
  const activeQuestIds = Object.keys(activeQuestsMap);
  const inProgressQuests = quests.filter((q) => activeQuestIds.includes(q.id));

  // ✨ RECOMMENDED QUEST LOGIC: Don't recommend quests we are already doing
  const unstartedQuests = quests.filter((q) => !activeQuestIds.includes(q.id));
  const displayQuests = unstartedQuests.length > 0 ? unstartedQuests : quests;
  const todayQuest = displayQuests[mainQuestIndex % displayQuests.length];

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
      <Screen contentClassName="pt-3 px-5">
        <AppText variant="title" className="mt-8 text-center text-ink/60">No quests available.</AppText>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pt-2">
      
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
          className="h-10 w-10 items-center justify-center rounded-full border border-line bg-cream"
        >
          <AppText variant="caption" className="font-sansBold text-ink">
            {profile?.fullName?.[0] ?? "A"}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* --- PAGE 1: RECOMMENDED QUEST FOR TODAY --- */}
      <Animated.View entering={FadeInDown.delay(120).duration(420)} className="px-5 mb-10">
        <View className="items-center mb-4">
          <AppText variant="eyebrow" className="text-muted mb-2 uppercase tracking-widest text-center">
            Recommended Quest For Today
          </AppText>
        </View>
        
        <View className="rounded-[32px] border border-line bg-cream overflow-hidden shadow-sm shadow-charcoal/5">
          <QuestHero quest={todayQuest} className="rounded-none" />
          
          {rerollsLeft > 0 && (
            <TouchableOpacity 
              onPress={handleReroll}
              className="w-full border-t border-line py-4 items-center bg-cream active:bg-line/30"
            >
              <AppText variant="caption" className="font-sansSemi text-ink">
                Different vibe ({rerollsLeft})
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* --- PAGE 2: IN PROGRESS HORIZONTAL SCROLL --- */}
      {/* --- PAGE 2: IN PROGRESS HORIZONTAL SCROLL --- */}
      <View className="px-5 mb-8">
        <View className="rounded-[32px] border border-line bg-cream py-5 overflow-hidden">
          {inProgressQuests.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {/* ✨ FIX: Removed the outer <View className="w-32"> wrapper, letting the card shape itself */}
              {inProgressQuests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} compact />
              ))}
            </ScrollView>
          ) : (
            <View className="py-2 items-center justify-center">
              <AppText className="text-muted font-sansMedium">No quests in progress</AppText>
            </View>
          )}
        </View>
      </View>

      {/* --- PAGE 3: FRIEND'S LORE --- */}
      <View className="px-5 pb-32"> 
        <AppText variant="title" className="mb-6">
          Friend's Lore
        </AppText>
        
        {loreEntries.length > 0 ? (
          loreEntries.map((entry) => (
            <View key={entry.id} className="mb-6">
              <LoreEntryCard entry={entry} />
            </View>
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