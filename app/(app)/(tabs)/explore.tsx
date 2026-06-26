import { View } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { Chip } from "../../../src/shared/components/Chip";
import { useQuests } from "../../../src/features/quests/api/questApi";

const filters = ["nearby", "quiet", "with friends", "half day", "creative"];

export default function ExploreScreen() {
  const { data: quests } = useQuests();

  return (
    <Screen contentClassName="pt-3">
      <View className="mb-6">
        <AppText variant="eyebrow">Explore</AppText>
        <AppText variant="display" className="mt-2">Choose a doorway.</AppText>
        <AppText className="mt-4 max-w-[320px]">
          Curated prompts for food, culture, nature and deliberate detours. Every one should become a story.
        </AppText>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-2">
        {filters.map((filter) => (
          <Chip key={filter} label={filter} />
        ))}
      </View>

      <SectionHeader eyebrow="Curated quests" title="Not chores. Openings." />
      {quests.map((quest) => (
        <QuestCard key={quest.id} quest={quest} />
      ))}
    </Screen>
  );
}
