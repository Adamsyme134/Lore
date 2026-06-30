// src/features/quests/components/QuestDetailBlock.tsx
import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";
import { LocationWidget } from "./widgets/LocationWidget";
import { RandomiserWidget } from './widgets/RandomiserWidget';
// Utility to parse URL-like parameters embedded in the widget tag
const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) obj[k] = decodeURIComponent(v || '');
  });
  return obj;
};


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

  return (
    <View className="rounded-card border border-line bg-cream p-6">
      
      <View className="mb-5 flex-row flex-wrap gap-2">
        {Array.isArray(quest.categories) ? quest.categories.map(cat => (
          <Chip key={cat} label={cat} />
        )) : null}
        {quest.category && (!quest.categories || quest.categories.length === 0) ? <Chip label={quest.category} /> : null}
        {quest.length ? <Chip label={quest.length} /> : null}
        {quest.difficulty ? <Chip label={quest.difficulty} /> : null}
        {quest.cost ? <Chip label={quest.cost} /> : null}
        {groupLabel ? <Chip label={groupLabel} /> : null}
        {quest.pointsValue > 0 ? <Chip label={`${quest.pointsValue} LP`} /> : null}
      </View>

      <AppText variant="subtitle" className={accent.text}>Why this exists</AppText>
      <AppText className="mt-3 text-ink/70">{quest.whyItMatters}</AppText>
      
      <View className="my-6 h-px bg-line" />
      
      <AppText variant="subtitle">A clean way to do it</AppText>
      <View className="mt-4 gap-4">
        {quest.steps.map((step, index) => {
          const isChecked = checkedSteps.includes(index);
          // Universal regex split prevents the Location tag from breaking formatting
          const parsed = step.split(/(\[[A-Z_]+:.*?\])/g);

          return (
            <Pressable 
              key={index} 
              className="flex-row gap-4 items-start"
              onPress={() => { if (isActive && onToggleStep) onToggleStep(index); }}
              disabled={!isActive}
            >
              <View className={`h-7 w-7 mt-1 items-center justify-center rounded-md border-2 ${isChecked ? accent.bg + ' border-transparent' : 'border-line ' + accent.subtle}`}>
                {isChecked ? <AppText className="text-white text-xs font-bold">✓</AppText> : <AppText variant="caption" className={accent.text}>{index + 1}</AppText>}
              </View>
              
              <Text className={`flex-1 leading-8 text-base font-sans ${isChecked ? 'text-ink/40 line-through' : 'text-ink/70'}`}>
                {parsed.map((part, i) => {
                  if (part.startsWith('[RANDOMISER:')) {
                    const raw = part.replace('[RANDOMISER:', '').replace(']', '');
                    return <RandomiserWidget key={i} config={raw as any} accent={quest.accent} />;
                  }
                  if (part.startsWith("[LOCATION:")) {
  const raw = part
    .replace("[LOCATION:", "")
    .replace("]", "");

  return (
    <LocationWidget
      key={i}
      config={raw as any}
      accent={accent}
    />
  );
}
                  return <Text key={i}>{part}</Text>;
                })}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}