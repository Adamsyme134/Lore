import { Pressable, View } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";

type QuestDetailBlockProps = {
  quest: Quest;
  checkedSteps?: number[];
  onToggleStep?: (index: number) => void;
  isActive?: boolean;
};

export function QuestDetailBlock({ quest, checkedSteps = [], onToggleStep, isActive = false }: QuestDetailBlockProps) {
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
        {quest.steps.map((step, index) => {
          const isChecked = checkedSteps.includes(index);
          return (
            <Pressable 
              key={step} 
              className="flex-row gap-4 items-center"
              onPress={() => {
                if (isActive && onToggleStep) {
                  onToggleStep(index);
                }
              }}
              disabled={!isActive}
            >
              <View className={`h-7 w-7 items-center justify-center rounded-md border-2 ${isChecked ? accent.bg + ' border-transparent' : 'border-line ' + accent.subtle}`}>
                {isChecked ? (
                  <AppText className="text-white text-xs font-bold">✓</AppText>
                ) : (
                  <AppText variant="caption" className={accent.text}>{index + 1}</AppText>
                )}
              </View>
              <AppText className={`flex-1 ${isChecked ? 'text-ink/40 line-through' : 'text-ink/70'}`}>{step}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}