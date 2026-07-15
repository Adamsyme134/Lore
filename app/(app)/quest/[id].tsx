import { View, Pressable, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { QuestDetailBlock } from "../../../src/features/quests/components/QuestDetailBlock";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useQuest, useSaveQuest, useActivateQuest, useTrackQuestView } from "../../../src/features/quests/api/questApi";
import { useEffect } from "react";
import { Ionicons } from '@expo/vector-icons'; 

import { QuestExecutionProvider } from "../../../src/features/quests/context/QuestExecutionContext";
import { QuestHero } from "../../../src/features/quests/components/QuestHero";

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quest } = useQuest(id);
  const { savedQuestIds, activeQuests, toggleQuestStep } = useExperienceStore(); 
  const saveQuest = useSaveQuest();
  const activateQuest = useActivateQuest();
  const trackView = useTrackQuestView();
  
  // Fire exactly once when the quest ID is resolved and opened
  useEffect(() => {
    if (quest?.id) {
      trackView.mutate(quest.id);
    }
  }, [quest?.id]);
  const insets = useSafeAreaInsets();

  if (!quest) {
    return (
      <Screen contentClassName="px-0">
        <View style={{ paddingTop: Math.max(insets.top, 20) }} className="px-5 pb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="arrow-back" size={20} color="var(--color-text)" />
          </Pressable>
        </View>
        <AppText variant="title" className="px-5">Quest not found.</AppText>
      </Screen>
    );
  }

  const isSaved = savedQuestIds.includes(quest.id);
  const isActive = activeQuests[quest.id] !== undefined;
  const checkedSteps = activeQuests[quest.id] || [];
  const hasContentBlocks = quest.contentBlocks && quest.contentBlocks.length > 0;
  const isCompleteReady = hasContentBlocks 
    ? true 
    : (quest.steps && quest.steps.length > 0 && checkedSteps.length === quest.steps.length);
    
  return (
    <Screen scroll={false} contentClassName="px-0 relative">
      <QuestExecutionProvider>
        
        {/* ABSOLUTE FLOATING TOP NAV */}
        <View 
          className="absolute top-0 left-0 right-0 z-50 flex-row justify-between items-center px-5" 
          style={{ paddingTop: Math.max(insets.top, 20) }}
          pointerEvents="box-none"
        >
          <Pressable 
            onPress={() => router.back()} 
            className="h-10 w-10 items-center justify-center rounded-full bg-[#1c1a17]/30 backdrop-blur-md border border-white/20"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </Pressable>

          <Pressable 
            onPress={() => {}} 
            className="h-10 w-10 items-center justify-center rounded-full bg-[#1c1a17]/30 backdrop-blur-md border border-white/20"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </Pressable>
        </View>

        {/* SCROLL VIEW 
          Index 0: Hero & Gallery 
          Index 1: Sticky Progress Bar
          Index 2: Steps & Buttons
        */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerClassName="pb-36"
          stickyHeaderIndices={[1]}
        >
          
          {/* [INDEX 0]: HERO & GALLERY */}
          <View>
            <QuestHero 
              quest={quest} 
              isSaved={isSaved} 
              onSavePress={() => saveQuest.mutate(quest.id)} 
            />

            <View className="px-5">
              {quest.galleryUrls && quest.galleryUrls.filter(Boolean).length > 0 && (
                <View className="mt-4 flex-row gap-2">
                  {quest.galleryUrls.filter(Boolean).map((url, i) => (
                    <Image key={i} source={{ uri: url }} className="flex-1 aspect-square rounded-2xl bg-surface border border-line/50" contentFit="cover" />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* [INDEX 1]: STICKY PROGRESS BAR */}
          <View className="bg-background z-40">
            {isActive ? (
              <View className="px-5 py-4 border-b border-line/50 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                  <AppText className="text-[10px] font-sansSemi text-ink dark:text-ivory uppercase tracking-widest">Quest Progress</AppText>
                  <AppText className="text-[10px] font-sansSemi text-ink/60 dark:text-ivory/60 uppercase tracking-widest">
                    {checkedSteps.length} of {quest.steps.length} Completed
                  </AppText>
                </View>
                <View className="h-[3px] w-full bg-line rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-ink rounded-full" 
                    style={{ width: `${(checkedSteps.length / quest.steps.length) * 100}%` }} 
                  />
                </View>
              </View>
            ) : (
              <View className="h-0" />
            )}
          </View>

          {/* [INDEX 2]: DETAILS & BOTTOM BUTTONS */}
          <View className="px-5">
            <View className="mt-5">
              <QuestDetailBlock 
                quest={quest} 
                checkedSteps={checkedSteps} 
                onToggleStep={(index) => toggleQuestStep(quest.id, index)} 
                isActive={isActive} 
              />
            </View>

            <View className="mt-6 flex-row gap-3">
              {!isActive ? (
                quest.maxParticipants > 1 ? (
                  <Button label="Start with Group" onPress={() => router.push({ pathname: "/(app)/group/select", params: { questId: quest.id } })} className="flex-1" />
                ) : (
                  <Button label={activateQuest.isPending ? "Starting..." : "Start quest"} onPress={() => activateQuest.mutate(quest.id)} className="flex-1" />
                )
              ) : isCompleteReady ? (
                <Button label="Complete Quest" className="flex-1 bg-orange" onPress={() => router.push({ pathname: "/complete/[questId]", params: { questId: quest.id } })} />
              ) : (
                <Button label={`${checkedSteps.filter(index => index < quest.steps.length).length}/${quest.steps.length} Steps`} variant="secondary" className="flex-1" disabled />
              )}
              
              {!isActive && quest.maxParticipants <= 1 && (
                <Pressable onPress={() => router.push({ pathname: "/(app)/group/select", params: { questId: quest.id } })} className="h-[56px] w-[56px] items-center justify-center rounded-[20px] border border-line bg-surface">
                  <Ionicons name="people" size={24} color="var(--color-text)" />
                </Pressable>
              )}
            </View>
          </View>

        </ScrollView>
      </QuestExecutionProvider>
    </Screen>
  );
}