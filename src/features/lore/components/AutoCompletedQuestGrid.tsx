import type { Quest } from "../../../shared/types/domain";
import { Pressable, View } from "react-native";
import { LoreCard } from "./LoreCard";

type AutoCompletedQuestGridProps = {
  quests: Quest[];
  onQuestPress?: (quest: Quest) => void;
};

export function AutoCompletedQuestGrid({ quests, onQuestPress }: AutoCompletedQuestGridProps) {
  if (quests.length === 0) return null;

  return (
    <View className="-mx-[1px] w-full flex-row flex-wrap">
      {quests.map((quest) => {
        const content = (
          <View
            pointerEvents="none"
            className="w-full h-full overflow-hidden rounded-2xl"
            style={{
              width: "300%",
              height: "300%",
              transform: [{ scale: 0.3333 }]
            }}
          >
            <LoreCard
              heroImageUri={quest.imageUrl}
              title={quest.title}
              caption={quest.kicker || quest.description}
              locationName={quest.locationHint}
            />
          </View>
        );

        return onQuestPress ? (
          <Pressable
            key={quest.id}
            onPress={() => onQuestPress(quest)}
            className="w-1/3 aspect-[3/4] p-[1px] items-center justify-center overflow-hidden"
          >
            {content}
          </Pressable>
        ) : (
          <View key={quest.id} className="w-1/3 aspect-[3/4] p-[1px] items-center justify-center overflow-hidden">
            {content}
          </View>
        );
      })}
    </View>
  );
}
