// src/features/map/components/EntryMap.web.tsx
import { View } from "react-native";
import { AppText } from "../../../shared/components/AppText";
import type { LoreEntry } from "../../../shared/types/domain";

type EntryMapProps = {
  entries?: LoreEntry[];
  // Add any other props your standard EntryMap expects if TypeScript complains
};

// This is a simple placeholder that will render ONLY on the web / MacBook Admin tool
export function EntryMap(props: EntryMapProps) {
  return (
    <View className="flex-1 w-full items-center justify-center bg-stone">
      <AppText variant="subtitle" className="text-ink/40">
        📍 Full Screen Map
      </AppText>
      <AppText variant="caption" className="text-ink/30 mt-1">
        (Native maps are disabled in the web builder)
      </AppText>
    </View>
  );
}