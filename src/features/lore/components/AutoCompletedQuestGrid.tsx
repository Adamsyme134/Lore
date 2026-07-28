import { View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";

type AutoCompletedQuestGridProps = {
  quests: Quest[];
};

export function AutoCompletedQuestGrid({ quests }: AutoCompletedQuestGridProps) {
  if (quests.length === 0) return null;

  return (
    <View className="w-full flex-row flex-wrap">
      {quests.map((quest) => (
        <View key={quest.id} className="w-1/3 p-[1px]">
          <View className="aspect-[1/1.414] overflow-hidden bg-stone">
            <Image
              source={{ uri: quest.imageUrl }}
              className="h-full w-full"
              contentFit="cover"
              contentPosition={(quest.imagePosition || "center") as any}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.82)"]}
              style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "62%" }}
            />
            <View className="absolute bottom-0 left-0 right-0 p-2">
              {quest.kicker ? (
                <AppText className="mb-1 text-[7px] uppercase tracking-widest text-ivory/75" numberOfLines={1}>
                  {quest.kicker}
                </AppText>
              ) : null}
              <AppText className="font-serif text-xs leading-4 text-ivory" numberOfLines={3}>
                {quest.title}
              </AppText>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
