import { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { JourneyTreeMap } from "../../../src/features/quests/components/JourneyTreeMap";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import { useJourneys, useQuests, useSaveQuest, useUserJourneyStatuses, useUserQuestStatuses } from "../../../src/features/quests/api/questApi";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";

export default function Journeys() {
  const router = useRouter();
  const colors = useThemeColors();
  const [selectedJourneyNodeId, setSelectedJourneyNodeId] = useState<string | null>(null);

  const { savedQuestIds, activeQuests } = useExperienceStore();
  const saveQuest = useSaveQuest();
  const { data: journeys = [], isLoading: isLoadingJourneys, isFetching: isFetchingJourneys } = useJourneys();
  const { data: quests = [] } = useQuests();
  const { data: questStatuses } = useUserQuestStatuses();
  const { data: journeyStatuses } = useUserJourneyStatuses();
  const { data: loreEntries = [] } = useLoreEntries();

  const activeQuestIds = useMemo(
    () => new Set([...(questStatuses?.active || []), ...Object.keys(activeQuests)]),
    [activeQuests, questStatuses?.active]
  );
  const completedQuestIds = useMemo(() => {
    const ids = new Set(questStatuses?.completed || []);
    loreEntries.forEach((entry) => {
      if (entry.questId) ids.add(entry.questId);
      entry.autoCompletedQuests?.forEach((quest) => ids.add(quest.id));
    });
    return ids;
  }, [loreEntries, questStatuses?.completed]);
  const completedJourneyIds = useMemo(() => new Set(journeyStatuses?.completed || []), [journeyStatuses?.completed]);
  const journeyTreeProgress = useMemo(
    () => ({
      completedQuestIds,
      completedJourneyIds,
      activeQuestIds
    }),
    [activeQuestIds, completedJourneyIds, completedQuestIds]
  );
  const activeJourneys = useMemo(() => journeys.filter((journey) => journey.isActive), [journeys]);

  return (
    <Screen scroll={false}>
      <View className="flex-1 pb-28 pt-6">
        <View className="px-6 pb-4">
          <AppText variant="display">Journeys</AppText>
        </View>
        {(isLoadingJourneys || isFetchingJourneys) && activeJourneys.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : activeJourneys.length === 0 ? (
          <View className="mx-6 flex-1 items-center justify-center rounded-card border border-dashed border-line">
            <AppText className="text-center text-muted">No journeys found.</AppText>
          </View>
        ) : (
          <View className="flex-1 overflow-hidden">
            <JourneyTreeMap
              journeys={activeJourneys}
              quests={quests}
              progress={journeyTreeProgress}
              selectedNodeId={selectedJourneyNodeId}
              onSelectNode={(node) => setSelectedJourneyNodeId(node.id)}
              onDeselectNode={() => setSelectedJourneyNodeId(null)}
              onQuestPress={(quest) => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
              onEntryPress={(entry) => router.push({ pathname: "/lore/[id]", params: { id: entry.id } })}
              onJourneyPress={(journeyId) => router.push({ pathname: "/journey/[id]", params: { id: journeyId } })}
              onSaveQuest={(quest) => saveQuest.mutate(quest.id)}
              savedQuestIds={savedQuestIds}
              completedLoreEntries={loreEntries}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
