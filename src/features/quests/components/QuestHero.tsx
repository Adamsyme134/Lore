// src/features/quests/components/QuestHero.tsx
import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Button } from "../../../shared/components/Button";
import { Chip } from "../../../shared/components/Chip";

type QuestHeroProps = {
  quest: Quest;
  className?: string; // ✨ Added className prop
};

export function QuestHero({ quest, className }: QuestHeroProps) {
  return (
    <Pressable 
      onPress={() => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })} 
      // ✨ Use the passed className or default to rounded-[40px]
      className={`overflow-hidden bg-charcoal ${className ?? 'rounded-[40px]'}`}
    >
      <View className="h-[520px]">
        <Image
          source={{ uri: quest.imageUrl }}
          transition={400}
          contentFit="cover"
          style={{ height: "100%", width: "100%", opacity: 0.86 }}
        />
        <View className="absolute inset-0 bg-charcoal/30" />
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-7">
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <View className="mb-5 flex-row flex-wrap gap-2">
              <Chip label={quest.duration} tone="dark" />
              <Chip label={quest.locationHint} tone="dark" />
              <Chip label={`${quest.pointsValue} LP`} tone="dark" />
            </View>
            <AppText variant="eyebrow" className="mb-3 text-ivory/80">
              {quest.kicker}
            </AppText>
            <AppText variant="display" className="text-ivory">
              {quest.title}
            </AppText>
            <AppText className="mt-4 text-ivory/78">
              {quest.description}
            </AppText>
            <Button label="Open quest" className="mt-7" variant="primary" />
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
}