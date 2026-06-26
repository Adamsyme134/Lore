import { View } from "react-native";
import type { FriendMoment } from "../../../shared/types/domain";
import { ImageFrame } from "../../../shared/components/ImageFrame";
import { AppText } from "../../../shared/components/AppText";
import { accentClass } from "../../../shared/design/tokens";

type FriendMomentCardProps = {
  moment: FriendMoment;
};

export function FriendMomentCard({ moment }: FriendMomentCardProps) {
  const accent = accentClass[moment.accent];

  return (
    <View className="mb-4 overflow-hidden rounded-card border border-line bg-cream">
      <ImageFrame uri={moment.imageUrl} className="h-56 overflow-hidden rounded-t-card bg-stone" />
      <View className="p-5">
        <View className="mb-2 flex-row items-center justify-between">
          <AppText variant="eyebrow" className={accent.text}>{moment.name}</AppText>
          <AppText variant="caption">{moment.location}</AppText>
        </View>
        <AppText variant="subtitle">{moment.title}</AppText>
        <View className="mt-4 rounded-3xl bg-ivory px-4 py-3">
          <AppText className="text-ink/70">“{moment.reaction}”</AppText>
        </View>
      </View>
    </View>
  );
}
