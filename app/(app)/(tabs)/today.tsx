// app/(app)/(tabs)/today.tsx
import { View, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { QuestHero } from "../../../src/features/quests/components/QuestHero";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { LoreEntryCard } from "../../../src/features/lore/components/LoreEntryCard";
import { useQuests, useActiveQuests } from "../../../src/features/quests/api/questApi";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
import { PointsPill } from "../../../src/features/points/components/PointsPill";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { TopBar } from "../../../src/shared/components/TopBar"; // <-- Add this if you want the profile picture up top!

export default function TodayScreen() {
  const { data: activeQuests = [] } = useActiveQuests();
  // ✨ FIX: Add empty array fallbacks and grab isLoading
  const { data: quests = [], isLoading: isLoadingQuests } = useQuests();
  const { data: loreEntries = [] } = useLoreEntries();
  
  const { profile } = useAuth();
  const previewPoints = useExperienceStore((state) => state.previewPoints);
  
  const todayQuest = quests[0];
  const secondaryQuests = quests.slice(1, 3);
  const points = profile?.pointsTotal ?? 0;

  // ✨ FIX: Show a loading state while fetching the real database
  if (isLoadingQuests) {
    return (
      <Screen contentClassName="flex-1 items-center justify-center">
        <ActivityIndicator color="#2c2a25" />
      </Screen>
    );
  }

  if (!todayQuest) {
    return (
      <Screen contentClassName="pt-3 px-5">
        <TopBar showProfile={true} />
        <AppText variant="title" className="mt-8 text-center text-ink/60">No quests available.</AppText>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pt-3">
      {/* 1. Use the TopBar component here, which already has the Pressable logic */}
      <TopBar title="Lore" showProfile={true} />

      <View className="mb-5 flex-row items-start justify-between gap-4 px-5">
        <View className="flex-1">
          {/* Removed the manual "Lore" header text since it's now in the TopBar */}
          <AppText variant="title" className="mt-1">Do something worth remembering.</AppText>
        </View>
        <View className="items-end gap-3">
          {/* 2. Remove the manual circle View here entirely, 
              as TopBar now handles the profile button */}
          <PointsPill points={points} />
        </View>
      </View>
      {activeQuests.length > 0 && (
  <View className="mb-6">
    <SectionHeader eyebrow="In progress" title="Current adventures" />
    {activeQuests.map(q => (
      <QuestCard key={q.id} quest={q} compact />
    ))}
  </View>
)}
      <QuestHero quest={todayQuest} />

      <Animated.View entering={FadeInDown.delay(120).duration(420)}>
        <SectionHeader
          eyebrow="This week"
          title="Small openings"
          body="Lore Points acknowledge completed memories. No streaks, rankings, or chore loops."
        />
        {secondaryQuests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} compact />
        ))}
      </Animated.View>

      <SectionHeader
        eyebrow="Recent lore"
        title="What you have been collecting"
        body="The archive should feel like evidence that your life has texture."
      />
      {loreEntries[0] ? <LoreEntryCard entry={loreEntries[0]} featured /> : null}
    </Screen>
  );
}