import { TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { isQuestCollectionComplete } from "../api/questApi";
import type { Quest, QuestCollection } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

export function CollectionCard({
  collection,
  quests,
  completedQuestIds,
  width
}: {
  collection: QuestCollection;
  quests: Quest[];
  completedQuestIds: Set<string>;
  width: number;
}) {
  const router = useRouter();
  const includedQuests = collection.questIds.map((id) => quests.find((quest) => quest.id === id)).filter(Boolean) as Quest[];
  const completedCount = includedQuests.filter((quest) => completedQuestIds.has(quest.id)).length;
  const isComplete = isQuestCollectionComplete(collection, completedQuestIds);
  const thumbnailWidth = (width - 48) / 3;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: "/collection/[id]", params: { id: collection.id } })}
      className="mr-4 overflow-hidden rounded-xl border border-ivory/10 bg-[#101914]"
      style={{ width, height: width * 1.474 }}
    >
      <Image
        source={{ uri: collection.coverImageUrl }}
        style={{ height: "100%", width: "100%" }}
        contentFit="cover"
        contentPosition={contentPosition(collection.imagePosition) as any}
      />
      <LinearGradient
        colors={["rgba(7,17,14,0.16)", "rgba(7,17,14,0.58)", "rgba(7,17,14,0.96)"]}
        locations={[0, 0.42, 1]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <View className="absolute inset-0 p-4">
        <View className="mb-8 flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-md bg-ivory/18">
            <Ionicons name={(collection.iconName as any) || "albums-outline"} size={14} color="#F3F0EB" />
          </View>
          <AppText className="text-[8px] uppercase text-ivory/55">Collection</AppText>
        </View>
        <AppText variant="subtitle" className="text-ivory" style={{ fontSize: 20.4, lineHeight: 24 }} numberOfLines={2}>
          {collection.title}
        </AppText>
        <AppText className="mt-2 text-xs leading-4 text-ivory/78" numberOfLines={2}>
          {collection.description || `${includedQuests.length} experiences to discover.`}
        </AppText>

        <View className="mt-auto">
          <View className="mb-3 flex-row">
            {includedQuests.slice(0, 3).map((quest, index) => (
              <Image
                key={quest.id}
                source={{ uri: quest.imageUrl }}
                className="bg-stone"
                style={{ borderRadius: 6, height: 48, marginRight: index < 2 ? 8 : 0, width: thumbnailWidth }}
                contentFit="cover"
                contentPosition={contentPosition(quest.imagePosition) as any}
              />
            ))}
          </View>
          <View className="mb-3 items-center">
            <AppText className="text-ivory/70" style={{ fontSize: 9 }}>
              {completedCount}/{includedQuests.length || 1} completed
            </AppText>
          </View>
          <View className="flex-row items-center justify-between rounded-md bg-ivory px-3 py-2">
            <AppText className="text-xs font-sansSemi text-[#1C1A17]">
              {isComplete ? "Completed" : "Explore Collection"}
            </AppText>
            <Ionicons name="chevron-forward" size={16} color="#1C1A17" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
