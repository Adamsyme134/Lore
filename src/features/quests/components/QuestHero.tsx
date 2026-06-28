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
};

export function QuestHero({ quest, className }: QuestHeroProps) {
  // Shared navigation handler
  const handlePress = () => router.push({ pathname: "/quest/[id]", params: { id: quest.id } });

  return (
    <Pressable 
      onPress={handlePress} 
      className={`overflow-hidden bg-charcoal ${className ?? 'rounded-[40px]'}`}
    >
      <View className="h-[520px]">
        <Image
          source={{ uri: quest.imageUrl }}
          transition={400}
          contentFit="cover"
          style={{ height: "100%", width: "100%", opacity: 0.9 }}
        />
        
        {/* We keep a lighter gradient just so the white title text above the widget stands out */}
        <LinearGradient
          colors={['transparent', 'rgba(28, 26, 23, 0.8)']}
          locations={[0.4, 0.9]} 
          className="absolute inset-0"
        />

        <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <View className="mb-5 flex-row flex-wrap gap-2">
              <Chip label={quest.duration} tone="light" />
              <Chip label={quest.locationHint} tone="light" />
              <Chip label={`${quest.pointsValue} LP`} tone="light" />
            </View>
            <AppText variant="eyebrow" className="mb-3 text-ivory/80">
              {quest.kicker}
            </AppText>
            <AppText variant="display" className="text-ivory">
              {quest.title}
            </AppText>
            
            {/* ✨ FIX: Wrapped the description text in a solid bg-ink widget */}
            <View className="mt-4 rounded-[20px] bg-ink p-4 shadow-md border border-line/5">
              <AppText className="text-ivory/90 leading-6">
                {quest.description}
              </AppText>
            </View>
            
            <Button 
              label="Open quest" 
              className="mt-5" 
              variant="primary" 
              onPress={handlePress} 
            />
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
}