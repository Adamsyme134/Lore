import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Chip } from "../../../src/shared/components/Chip";
import { MapPreview } from "../../../src/features/map/components/MapPreview";
import { accentClass } from "../../../src/shared/design/tokens";
import { useLoreEntry } from "../../../src/features/lore/api/loreApi";

export default function LoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry } = useLoreEntry(id);

  if (!entry) {
    return (
      <Screen>
        <TopBar showBack title="Lore" />
        <AppText variant="title">Entry not found.</AppText>
      </Screen>
    );
  }

  const accent = accentClass[entry.accent];

  return (
    <Screen contentClassName="px-0 pb-36">
      <TopBar showBack title="Lore Entry" />
      <View className="px-5">
        <View className="overflow-hidden rounded-[40px] bg-charcoal">
          <View className="h-[470px]">
            <Image source={{ uri: entry.imageUrl }} contentFit="cover" transition={360} style={{ height: "100%", width: "100%", opacity: 0.9 }} />
            <View className="absolute inset-0 bg-charcoal/20" />
            <View className="absolute bottom-0 left-0 right-0 p-6">
              <AppText variant="eyebrow" className="mb-3 text-ivory/80">{entry.date}</AppText>
              <AppText variant="display" className="text-ivory">{entry.title}</AppText>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row flex-wrap gap-2">
          <Chip label={entry.location} />
          <Chip label={entry.mood} />
          <Chip label={`+${entry.pointsAwarded} LP`} />
          {entry.tags.map((tag) => <Chip key={tag} label={tag} />)}
        </View>

        <View className="mt-6 rounded-card border border-line bg-cream p-6">
          <AppText variant="eyebrow" className={accent.text}>{entry.questTitle}</AppText>
          <AppText variant="subtitle" className="mt-4">What happened</AppText>
          <AppText className="mt-3 text-ink/70">{entry.journal}</AppText>
          {entry.people.length > 0 ? (
            <AppText variant="caption" className="mt-5 font-sansSemi text-ink">
              People: {entry.people.join(", ")}
            </AppText>
          ) : null}
        </View>

        {entry.photos.length > 1 ? (
          <View className="mt-6 rounded-card border border-line bg-cream p-5">
            <AppText variant="eyebrow">Photographs</AppText>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {entry.photos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.uri }} contentFit="cover" style={{ width: 96, height: 116, borderRadius: 24 }} />
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <MapPreview location={entry.location} latitude={entry.latitude} longitude={entry.longitude} />
        </View>
      </View>
    </Screen>
  );
}
