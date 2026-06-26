import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { LoreEntry } from "../../../shared/types/domain";
import { ImageFrame } from "../../../shared/components/ImageFrame";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";

type LoreEntryCardProps = {
  entry: LoreEntry;
  featured?: boolean;
};

export function LoreEntryCard({ entry, featured = false }: LoreEntryCardProps) {
  return (
    <Pressable onPress={() => router.push({ pathname: "/lore/[id]", params: { id: entry.id } })} className="mb-4 overflow-hidden rounded-card border border-line bg-cream">
      {({ pressed }) => (
        <View className={pressed ? "opacity-90" : undefined}>
          <ImageFrame uri={entry.imageUrl} className={featured ? "h-72 overflow-hidden rounded-t-card bg-stone" : "h-52 overflow-hidden rounded-t-card bg-stone"} />
          <View className="p-5">
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Chip label={entry.date} />
              <AppText variant="caption">{entry.location}</AppText>
            </View>
            <AppText variant="subtitle">{entry.title}</AppText>
            <AppText className="mt-2">{entry.excerpt}</AppText>
            <View className="mt-4 flex-row items-center justify-between">
              {entry.people.length > 0 ? (
                <AppText variant="caption" className="font-sansSemi text-ink">
                  With {entry.people.join(", ")}
                </AppText>
              ) : <View />}
              <AppText variant="caption" className="font-sansSemi text-ink">+{entry.pointsAwarded} LP</AppText>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}
