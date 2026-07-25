import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import type { FriendMoment } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { LoreCard } from "../../lore/components/LoreCard";
import { useToggleLoreLike } from "../api/socialApi";
import { imageSource } from "../../../shared/utils/imageSource";

type FriendLoreFeedProps = {
  moments: FriendMoment[];
};

export function FriendLoreFeed({ moments }: FriendLoreFeedProps) {
  const router = useRouter();
  const toggleLike = useToggleLoreLike();
  const [localLikes, setLocalLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [containerWidth, setContainerWidth] = useState(0);
  const cardWidth = Math.max(containerWidth, 1);
  const cardHeight = cardWidth * 4 / 3;
  const cardGap = 16;

  const handleToggleLike = (moment: FriendMoment) => {
    const current = localLikes[moment.id] ?? {
      count: moment.likeCount ?? 0,
      liked: moment.likedByMe ?? false
    };
    const next = {
      liked: !current.liked,
      count: Math.max(current.count + (current.liked ? -1 : 1), 0)
    };

    setLocalLikes((prev) => ({ ...prev, [moment.id]: next }));
    toggleLike.mutate(
      { entryId: moment.id, liked: current.liked },
      {
        onError: () => {
          setLocalLikes((prev) => ({ ...prev, [moment.id]: current }));
        }
      }
    );
  };

  return (
    <View className="mt-2" onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={{ height: cardHeight + cardGap }}>
      {containerWidth > 0 ? (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={cardHeight + cardGap}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ paddingBottom: cardGap }}
        >
          {moments.map((moment) => {
          const likeState = localLikes[moment.id] ?? {
            count: moment.likeCount ?? 0,
            liked: moment.likedByMe ?? false
          };

          return (
            <TouchableOpacity
              key={moment.id}
              onPress={() => router.push(`/lore/${moment.id}`)}
              activeOpacity={0.9}
              className="relative overflow-hidden rounded-card"
              style={{ width: cardWidth, height: cardHeight, marginBottom: cardGap }}
            >
              <View pointerEvents="none" className="h-full w-full">
                <LoreCard
                  heroImageUri={moment.imageUrl}
                  title={moment.title}
                  caption={moment.reaction}
                  locationName={moment.location}
                />
              </View>

              <View className="absolute right-4 top-4 flex-row items-center rounded-full bg-black/45 py-2 pl-2 pr-3">
                <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-orange">
                  {moment.avatarUrl ? (
                    <Image source={imageSource(moment.avatarUrl)} contentFit="cover" style={{ height: "100%", width: "100%" }} />
                  ) : (
                    <AppText className="font-sansSemi text-xs text-ivory">
                      {moment.name.charAt(0).toUpperCase()}
                    </AppText>
                  )}
                </View>
                <AppText className="ml-2 font-sansSemi text-xs text-white">{moment.name}</AppText>
              </View>

              <TouchableOpacity
                accessibilityLabel="Comment"
                accessibilityRole="button"
                onPress={() => router.push(`/lore/${moment.id}`)}
                activeOpacity={0.75}
                className="absolute bottom-4 left-4 h-12 w-12 items-center justify-center rounded-full bg-black/45"
              >
                <Ionicons name="chatbubble-outline" size={22} color="white" />
              </TouchableOpacity>

              <View className="absolute bottom-4 right-4 items-center">
                <AppText className="mb-1 font-sansSemi text-xs text-white">{likeState.count}</AppText>
                <TouchableOpacity
                  accessibilityLabel="Like"
                  accessibilityRole="button"
                  onPress={() => handleToggleLike(moment)}
                  activeOpacity={0.75}
                  className="h-12 w-12 items-center justify-center rounded-full bg-black/45"
                >
                  <Ionicons name={likeState.liked ? "heart" : "heart-outline"} size={24} color="white" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}
