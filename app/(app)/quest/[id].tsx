import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { TopBar } from "../../../src/shared/components/TopBar";
import { QuestDetailBlock } from "../../../src/features/quests/components/QuestDetailBlock";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useQuest, useSaveQuest, useActivateQuest } from "../../../src/features/quests/api/questApi";
import { Ionicons } from '@expo/vector-icons'; // ✨ Added for bookmark symbol

export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quest } = useQuest(id);
  const { savedQuestIds, activeQuests, toggleQuestStep } = useExperienceStore(); // ✨ Brought in new state
  const saveQuest = useSaveQuest();
  const activateQuest = useActivateQuest();

  if (!quest) {
    return (
      <Screen>
        <TopBar showBack title="Quest" />
        <AppText variant="title">Quest not found.</AppText>
      </Screen>
    );
  }

  const isSaved = savedQuestIds.includes(quest.id);
  const isActive = activeQuests[quest.id] !== undefined;
  const checkedSteps = activeQuests[quest.id] || [];
  const isCompleteReady = quest.steps && quest.steps.length > 0 && checkedSteps.length === quest.steps.length;

  return (
    <Screen contentClassName="px-0 pb-36">
      <TopBar showBack title="Side Quest" />
      <View className="px-5">
        <View className="overflow-hidden rounded-[40px] bg-charcoal">
          <View className="h-[430px]">
            <Image source={{ uri: quest.imageUrl }} contentFit="cover" transition={360} style={{ height: "100%", width: "100%", opacity: 0.88 }} />
            <View className="absolute inset-0 bg-charcoal/25" />
            <View className="absolute bottom-0 left-0 right-0 p-6">
              <Animated.View entering={FadeInDown.duration(460)}>
                <AppText variant="eyebrow" className="mb-3 text-ivory/80">{quest.kicker}</AppText>
                <AppText variant="display" className="text-ivory">{quest.title}</AppText>
              </Animated.View>
            </View>
          </View>
        </View>

        <View className="mt-6 rounded-card border border-line bg-cream p-6">
          <AppText variant="subtitle">Journal prompt</AppText>
          <AppText className="mt-3 text-ink/70">{quest.journalPrompt}</AppText>
          <View className="mt-5 rounded-3xl bg-ivory px-4 py-3">
            <AppText variant="caption" className="font-sansSemi text-ink">
              Completion: {quest.pointsValue} Lore Points, plus up to 6 for photographs.
            </AppText>
          </View>
        </View>

        <View className="mt-5">
          <QuestDetailBlock 
            quest={quest} 
            checkedSteps={checkedSteps}
            onToggleStep={(index) => toggleQuestStep(quest.id, index)}
            isActive={isActive}
          />
        </View>

        <View className="mt-6 flex-row gap-3">
          
          {/* Bookmark Button */}
          <Pressable
            onPress={() => saveQuest.mutate(quest.id)}
            className={`h-[56px] w-[56px] items-center justify-center rounded-[20px] border ${
              isSaved ? 'bg-ink border-ink' : 'bg-white border-line'
            }`}
          >
            <Ionicons 
              name={isSaved ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={isSaved ? "#F6F5F2" : "#1C1A17"} 
            />
          </Pressable>

          {/* Start / Group / Complete Button Logic */}
          {!isActive ? (
            quest.maxParticipants > 1 ? (
              <Button 
                label="Start with Group" 
                onPress={() => router.push({ pathname: "/(app)/group/select", params: { questId: quest.id } })} 
                className="flex-1" 
              />
            ) : (
              <Button 
                label={activateQuest.isPending ? "Starting..." : "Start quest"} 
                onPress={() => activateQuest.mutate(quest.id)} 
                className="flex-1"
              />
            )
          ) : isCompleteReady ? (
            <Button
              label="Complete"
              className="flex-1 bg-orange"
              onPress={() => router.push({ pathname: "/complete/[questId]", params: { questId: quest.id } })}
            />
          ) : (
            <Button
              label={`${checkedSteps.length}/${quest.steps.length} Steps`}
              variant="secondary"
              className="flex-1"
              disabled
            />
          )}
        
        </View>
      </View>
    </Screen>
  );
}