// src/features/map/components/MapPreview.web.tsx
import { View } from "react-native";
import { AppText } from "../../../shared/components/AppText";
import type { LoreEntry } from "../../../shared/types/domain";

type MapPreviewProps = {
  entry?: LoreEntry; 
  // Add any other props your standard MapPreview expects
};

// This is a simple placeholder that will render ONLY on the web / MacBook Admin tool
export function MapPreview(props: MapPreviewProps) {
  return (
    <View className="h-48 w-full items-center justify-center rounded-[24px] bg-stone border border-line overflow-hidden">
      <AppText variant="subtitle" className="text-ink/40">
        📍 Map Preview
      </AppText>
      <AppText variant="caption" className="text-ink/30 mt-1">
        (Native maps are hidden in the web builder)
      </AppText>
    </View>
  );
}