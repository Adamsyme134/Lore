// src/features/quests/components/QuestHero.tsx
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient"; 
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Button } from "../../../shared/components/Button";
import { Chip } from "../../../shared/components/Chip";

type QuestHeroProps = {
  quest: Quest;
  className?: string;
  onPressOverride?: () => void;
};

export function QuestHero({ quest, className, onPressOverride }: QuestHeroProps) {
  const posMatch = quest.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPos = posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (quest.imagePosition || 'center');
  const handlePress = () => {
    if (onPressOverride) {
      onPressOverride();
    } else {
      router.push({ pathname: "/quest/[id]", params: { id: quest.id } });
    }
  };

  const isGroup = quest.maxParticipants > 1;
  const groupLabel = isGroup ? `Group (${quest.minParticipants}-${quest.maxParticipants})` : "Solo";

  return (
    <Pressable onPress={handlePress} className={`overflow-hidden bg-charcoal ${className ?? 'rounded-[40px]'}`}>
      <View className="h-[560px]">
        <Image
          source={{ uri: quest.imageUrl }}
          transition={400}
          contentFit="cover"
          contentPosition={contentPos as any}
          style={{ height: "100%", width: "100%", opacity: 0.9 }}
        />
        
        <LinearGradient
          colors={['transparent', 'rgba(28, 26, 23, 0.9)']}
          locations={[0.3, 0.95]} 
          className="absolute inset-0"
        />

        <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            
            <View className="mb-5 flex-row flex-wrap gap-2">
              {/* STRCIT BOOLEAN EVALUATORS PREVENT TEXT NODE ERRORS */}
              {Array.isArray(quest.categories) ? quest.categories.map(cat => (
                <Chip key={cat} label={cat} tone="light" />
              )) : null}
              {quest.length ? <Chip label={quest.length} tone="light" /> : null}
              {quest.difficulty ? <Chip label={quest.difficulty} tone="light" /> : null}
              {quest.cost ? <Chip label={quest.cost} tone="light" /> : null}
              {groupLabel ? <Chip label={groupLabel} tone="light" /> : null}
              {quest.pointsValue > 0 ? <Chip label={`${quest.pointsValue} LP`} tone="light" /> : null}
            </View>

            <AppText variant="eyebrow" className="mb-3 text-ivory/60">
              {quest.kicker}
            </AppText>
            <AppText variant="display" className="text-ivory">
              {quest.title}
            </AppText>
            
            <View className="mt-4 rounded-[20px] bg-ink p-4 shadow-md border border-line/5">
              <AppText className="text-ivory/60 leading-6">
                {quest.description}
              </AppText>
            </View>
            
            <Button label="Open quest" className="mt-5" variant="primary" onPress={handlePress} />
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
}