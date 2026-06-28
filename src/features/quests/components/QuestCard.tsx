// src/features/quests/components/QuestCard.tsx
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image"; 
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { ImageFrame } from "../../../shared/components/ImageFrame";
import { accentClass } from "../../../shared/design/tokens";
import { useExperienceStore } from "../../app/store/useExperienceStore";

type QuestCardProps = {
  quest: Quest;
  compact?: boolean;
};

export function QuestCard({ quest, compact = false }: QuestCardProps) {
  const accent = accentClass[quest.accent];
  const activeQuests = useExperienceStore(state => state.activeQuests);
  
  const checkedSteps = activeQuests[quest.id] || [];
  const progress = quest.steps?.length ? checkedSteps.length / quest.steps.length : 0;

  if (compact) {
    return (
      <Pressable 
        onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })} 
        className="h-40 w-40 overflow-hidden rounded-[24px] border border-line"
      >
        {({ pressed }) => (
          <View className={`flex-1 ${pressed ? "opacity-90" : ""}`}>
            <Image 
              source={{ uri: quest.imageUrl }} 
              contentFit="cover" 
              transition={200} 
              style={{ width: '100%', height: '100%', position: 'absolute' }} 
            />
            
            {/* ✨ FIX: Replaced gradient with a solid, bottom-anchored widget */}
            <View className="flex-1 justify-end p-2">
              <View className="w-full bg-ink rounded-[18px] p-3 shadow-md">
                
                {/* ✨ FIX: Matched text variant to the Hero Card Title */}
                <AppText variant="display" className="text-ivory text-sm mb-2.5" numberOfLines={2}>
                  {quest.title}
                </AppText>
                
                {/* Horizontal Progress Bar */}
                <View className="w-full h-1.5 overflow-hidden rounded-full bg-ivory/20">
                  <View 
                    className={`h-full ${accent.bg}`} 
                    style={{ width: `${progress * 100}%` }} 
                  />
                </View>
              </View>
            </View>

          </View>
        )}
      </Pressable>
    );
  }

  // Default Standard Layout (Used on the Explore Tab)
  return (
    <Pressable onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })} className="mb-4 overflow-hidden rounded-card border border-line bg-cream">
      {({ pressed }) => (
        <View className={pressed ? "opacity-90" : undefined}>
          <ImageFrame uri={quest.imageUrl} className="h-56 overflow-hidden rounded-t-card bg-stone" />
          <View className="p-5">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Chip label={quest.duration} />
              <View className={`h-2.5 w-2.5 rounded-full ${accent.bg}`} />
            </View>
            <AppText 
              variant="subtitle" 
              className="font-sansSemi text-ivory mb-2.5" 
              numberOfLines={2}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {quest.title}
            </AppText>
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