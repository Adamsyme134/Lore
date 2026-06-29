// src/features/quests/components/QuestDetailBlock.tsx
import { Pressable, View } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";
import { RandomiserWidget } from "./widgets/RandomiserWidget"; // ✨ NEW
import React from "react";
type QuestDetailBlockProps = {
  quest: Quest;
  checkedSteps?: number[];
  onToggleStep?: (index: number) => void;
  isActive?: boolean;
};

export function QuestDetailBlock({ quest, checkedSteps = [], onToggleStep, isActive = false }: QuestDetailBlockProps) {
  const accent = accentClass[quest.accent] || accentClass['orange']; 
  const isGroup = quest.maxParticipants > 1;
  const groupLabel = isGroup ? `Group (${quest.minParticipants}-${quest.maxParticipants})` : "Solo";

  const hasContentBlocks = quest.contentBlocks && quest.contentBlocks.length > 0;

  return (
    <View className="rounded-card border border-line bg-cream p-6">
      
      <View className="mb-5 flex-row flex-wrap gap-2">
        {quest.categories?.map(cat => <Chip key={cat} label={cat} />)}
        {quest.category && !quest.categories && <Chip label={quest.category} />}
        {quest.length ? <Chip label={quest.length} /> : null}
        {quest.difficulty ? <Chip label={quest.difficulty} /> : null}
        {quest.cost ? <Chip label={quest.cost} /> : null}
        {groupLabel ? <Chip label={groupLabel} /> : null}
        {quest.pointsValue ? <Chip label={`${quest.pointsValue} LP`} /> : null}
      </View>

      <AppText variant="subtitle" className={accent.text}>Why this exists</AppText>
      <AppText className="mt-3 text-ink/70">{quest.whyItMatters}</AppText>
      
      <View className="my-6 h-px bg-line" />
      
      <AppText variant="subtitle">{hasContentBlocks ? "The Experience" : "A clean way to do it"}</AppText>
      
      {hasContentBlocks ? (
        <AppText className="mt-4 text-ink/80 text-base leading-[32px]">
          {quest.contentBlocks!.map((block) => {
            if (block.type === 'text') {
              return <React.Fragment key={block.id}>{block.content}</React.Fragment>;
            } else if (block.type === 'widget' && block.widgetType === 'randomiser') {
              return <RandomiserWidget key={block.id} options={block.config.options} accent={quest.accent} />;
            }
            return null;
          })}
        </AppText>
      ) : (
        // LEGACY FALLBACK
        <View className="mt-4 gap-4">
          {quest.steps.map((step, index) => {
            const isChecked = checkedSteps.includes(index);
            return (
              <Pressable 
                key={step} 
                className="flex-row gap-4 items-center"
                onPress={() => isActive && onToggleStep && onToggleStep(index)}
                disabled={!isActive}
              >
                <View className={`h-7 w-7 items-center justify-center rounded-md border-2 ${isChecked ? accent.bg + ' border-transparent' : 'border-line ' + accent.subtle}`}>
                  {isChecked ? <AppText className="text-white text-xs font-bold">✓</AppText> : <AppText variant="caption" className={accent.text}>{index + 1}</AppText>}
                </View>
                <AppText className={`flex-1 ${isChecked ? 'text-ink/40 line-through' : 'text-ink/70'}`}>{step}</AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}