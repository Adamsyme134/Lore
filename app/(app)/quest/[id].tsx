import { View } from "react-native";
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



export default function QuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quest } = useQuest(id);
  const { savedQuestIds } = useExperienceStore();
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
          <QuestDetailBlock quest={quest} />
        </View>

        <View className="mt-6 flex-row gap-3">
          <Button
            label={isSaved ? "Saved" : "Save"}
            variant="secondary"
            className="flex-1"
            onPress={() => saveQuest.mutate(quest.id)}
          />
          <Button 
            label={activateQuest.isPending ? "Starting..." : "Start quest"} 
            onPress={() => activateQuest.mutate(quest.id)} 
          />
          <Button
            label="Complete"
            className="flex-1"
            onPress={() => router.push({ pathname: "/complete/[questId]", params: { questId: quest.id } })}
          />
        </View>
      </View>
    </Screen>
  );
}
