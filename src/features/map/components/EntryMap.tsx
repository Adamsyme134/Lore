import { View } from "react-native";
import { MapPreview } from "./MapPreview";
import { AppText } from "../../../shared/components/AppText";
import type { LoreEntry } from "../../../shared/types/domain";

type EntryMapProps = {
  entries: LoreEntry[];
};

export function EntryMap({ entries }: EntryMapProps) {
  return (
    <View>
      <View className="mb-5">
        <AppText variant="eyebrow">Personal atlas</AppText>
        <AppText variant="display" className="mt-2">Where the stories happened.</AppText>
        <AppText className="mt-4 max-w-[330px]">
          The map is not for tracking movement. It is a record of places that became memories.
        </AppText>
      </View>
      <MapPreview location="Your Lore map" entries={entries} />
    </View>
  );
}
