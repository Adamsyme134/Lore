// src/features/quests/components/QuestCard.tsx
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
type QuestCardProps = {
  quest: Quest;
  compact?: boolean;
};

export function QuestCard({ quest, compact = false }: QuestCardProps) {
  const isGroup = quest.maxParticipants > 1;
  const borderClass = isGroup ? 'border-[3px] border-[#2D6A4F]' : 'border border-line/20';
  const posMatch = quest.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPos = posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (quest.imagePosition || 'center');
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
      className={`overflow-hidden rounded-[24px] bg-stone relative ${borderClass}`}
      style={{ height: compact ? 160 : 280, width: compact ? 260 : 'auto' }} // ✨ FIX 1: Width explicitly set for horizontal lists
    >
      <Image
        source={{ uri: quest.imageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPos as any}
        transition={300}
      />

      <LinearGradient
        colors={['transparent', 'rgba(28, 26, 23, 0.95)']}
        locations={[0.2, 1]}
        className="absolute inset-0"
      />

      <View className="absolute bottom-0 left-0 right-0 p-5">
        {!compact && (
          <>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {Array.isArray(quest.categories) ? quest.categories.map(cat => (
                <Chip key={cat} label={cat} tone="light" />
              )) : null}
              {quest.length ? <Chip label={quest.length} tone="light" /> : null}
              {quest.difficulty ? <Chip label={quest.difficulty} tone="light" /> : null}
              {quest.cost ? <Chip label={quest.cost} tone="light" /> : null}
            </View>
            {quest.kicker && (
              <AppText variant="eyebrow" className="mb-2 text-ivory/80">
                {quest.kicker}
              </AppText>
            )}
          </>
        )}
        
        <AppText variant={compact ? "subtitle" : "display"} className="text-ivory">
          {quest.title}
        </AppText>
        
        {!compact && (
          <AppText numberOfLines={2} className="text-ivory/80 mt-1">
            {quest.description}
          </AppText>
        )}
      </View>

      {isGroup && (
        <View className="absolute top-4 right-4 bg-[#2D6A4F] px-3 py-1.5 rounded-full shadow-md border border-white/20">
          <AppText className="text-white text-xs font-sansSemi">Group Quest</AppText>
        </View>
      )}
    </Pressable>
  );
}