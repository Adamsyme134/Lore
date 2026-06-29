// src/features/quests/components/QuestDetailBlock.tsx
import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";

// 🎲 ACTIVE TRUE INLINE RANDOMISER WIDGET FOR END USERS
export function WorkingInlineRandomiser({ dataString, accent }: { dataString: string, accent: any }) {
  const options = dataString.replace('[RANDOMISER:', '').replace(']', '').split(',').map(s => s.trim()).filter(Boolean);
  const [selected, setSelected] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // ✨ Find the longest option to lock the width perfectly
  const longestOption = options.reduce((a, b) => a.length > b.length ? a : b, "🎲 Spin");

  const handleSpin = () => {
    if (options.length === 0 || isSpinning) return;
    setIsSpinning(true);
    let spins = 0;
    const interval = setInterval(() => {
      setSelected(options[Math.floor(Math.random() * options.length)]);
      spins++;
      if (spins > 10) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 100);
  };

  return (
    <View style={{ transform: [{ translateY: 3 }], marginHorizontal: 3 }}>
      <Pressable
        onPress={handleSpin}
        className={`rounded-lg justify-center items-center px-4 shadow-sm ${accent.bg}`}
        style={{ height: 36 }}
      >
        {/* INVISIBLE GHOST TEXT: This dictates the exact width of the button natively */}
        <AppText className="font-sansSemi text-[14px] opacity-0 h-0">{longestOption}</AppText>
        {/* VISIBLE TEXT: Absolutely positioned over the ghost text */}
        <View className="absolute inset-0 justify-center items-center">
          <AppText className="text-white font-sansSemi text-[14px]">
            {selected || "🎲 Spin"}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}

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
    const parsed = step.split(/(\[RANDOMISER:.*?\])/g);

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
        
        {/* ✨ By wrapping in a native <Text> node, the nested <View> flows perfectly inline with word-wrap! */}
        <Text className={`flex-1 leading-8 text-base font-sans ${isChecked ? 'text-ink/40 line-through' : 'text-ink/70'}`}>
          {parsed.map((part, i) => {
            if (part.startsWith('[RANDOMISER:')) {
              return <WorkingInlineRandomiser key={i} dataString={part} accent={accent} />;
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