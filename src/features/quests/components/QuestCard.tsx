import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { ImageFrame } from "../../../shared/components/ImageFrame";
import { accentClass } from "../../../shared/design/tokens";

type QuestCardProps = {
  quest: Quest;
  compact?: boolean;
};

export function QuestCard({ quest, compact = false }: QuestCardProps) {
  const accent = accentClass[quest.accent];

  return (
    <Pressable onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })} className="mb-4 overflow-hidden rounded-card border border-line bg-cream">
      {({ pressed }) => (
        <View className={pressed ? "opacity-90" : undefined}>
          <ImageFrame uri={quest.imageUrl} className={compact ? "h-40 overflow-hidden rounded-t-card bg-stone" : "h-56 overflow-hidden rounded-t-card bg-stone"} />
          <View className="p-5">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Chip label={quest.duration} />
              <View className={`h-2.5 w-2.5 rounded-full ${accent.bg}`} />
            </View>
            <AppText variant="subtitle">{quest.title}</AppText>
            <AppText className="mt-2">{quest.kicker}</AppText>
            <AppText variant="caption" className="mt-4 font-sansSemi text-ink">
              {quest.pointsValue} Lore Points on completion
            </AppText>
          </View>
        </View>
      )}
    </Pressable>
  );
}
