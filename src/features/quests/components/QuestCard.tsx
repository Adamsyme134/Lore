// src/features/quests/components/QuestCard.tsx
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { CategoryIconBadge, QuestMetaPills } from "./QuestMetadata";
type QuestCardProps = {
  quest: Quest;
  compact?: boolean;
  compactSize?: number;
  groupId?: string;
  onRemove?: () => void;
};

export function QuestCard({ quest, compact = false, compactSize, groupId, onRemove }: QuestCardProps) {
  const isGroup = quest.maxParticipants > 1;
  const borderClass = isGroup ? 'border-[3px] border-[#2D6A4F]' : 'border border-line/20';
  const posMatch = quest.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPos = posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (quest.imagePosition || 'center');
  const compactHeight = compactSize ?? 160;
  const compactWidth = compactSize ?? 260;
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/quest/[id]", params: groupId ? { id: quest.id, groupId } : { id: quest.id } })}
      className={`overflow-hidden rounded-[24px] bg-stone relative ${borderClass}`}
      style={{ height: compact ? compactHeight : 280, width: compact ? compactWidth : 'auto' }}
    >
      <Image
        source={{ uri: quest.imageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPos as any}
        transition={300}
      />

      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.88)"]}
        locations={[0, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: compact ? 112 : 176
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 px-5 py-5">
        {!compact && (
          <>
            {quest.kicker && (
              <AppText variant="eyebrow" className="mb-2 text-ivory/80">
                {quest.kicker}
              </AppText>
            )}
          </>
        )}
        
        <AppText
          variant={compact ? "subtitle" : "display"}
          className={compact ? "text-ivory leading-7" : "text-ivory leading-[52px]"}
          numberOfLines={compact ? 2 : undefined}
        >
          {quest.title}
        </AppText>
        <QuestMetaPills length={quest.length} difficulty={quest.difficulty} compact={compact} className={compact ? "mt-3" : "mt-4"} />
      </View>

      <CategoryIconBadge category={quest.categories?.[0] || quest.category} className="absolute left-4 top-4" size={compact ? "sm" : "md"} />

      {isGroup && (
        <View className="absolute top-4 right-4 bg-[#2D6A4F] px-3 py-1.5 rounded-full shadow-md border border-white/20">
          <AppText className="text-white text-xs font-sansSemi">Group Quest</AppText>
        </View>
      )}

      {onRemove ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute left-3 top-16 z-20 h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55"
        >
          <Ionicons name="trash-outline" size={18} color="#F6F5F2" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
