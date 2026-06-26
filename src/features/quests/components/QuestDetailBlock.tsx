import { View } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";

type QuestDetailBlockProps = {
  quest: Quest;
};

export function QuestDetailBlock({ quest }: QuestDetailBlockProps) {
  const accent = accentClass[quest.accent];

  return (
    <View className="rounded-card border border-line bg-cream p-6">
      <View className="mb-5 flex-row flex-wrap gap-2">
        <Chip label={quest.duration} />
        <Chip label={quest.locationHint} />
        <Chip label={quest.mood} />
      </View>
      <AppText variant="subtitle" className={accent.text}>
        Why this exists
      </AppText>
      <AppText className="mt-3 text-ink/70">{quest.whyItMatters}</AppText>
      <View className="my-6 h-px bg-line" />
      <AppText variant="subtitle">A clean way to do it</AppText>
      <View className="mt-4 gap-4">
        {quest.steps.map((step, index) => (
          <View key={step} className="flex-row gap-4">
            <View className={`h-7 w-7 items-center justify-center rounded-full ${accent.subtle}`}>
              <AppText variant="caption" className={accent.text}>{index + 1}</AppText>
            </View>
            <AppText className="flex-1 text-ink/70">{step}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
