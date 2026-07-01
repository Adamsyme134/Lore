import { Platform, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { AppText } from "../../../shared/components/AppText";
import type { LoreEntry } from "../../../shared/types/domain";

type MapPreviewProps = {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  entries?: LoreEntry[];
};

const oxford = {
  latitude: 51.752,
  longitude: -1.2577,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08
};

export function MapPreview({ location, latitude, longitude, entries }: MapPreviewProps) {
  const markers = entries?.filter((entry) => entry.latitude && entry.longitude) ?? [];
  const hasSingleMarker = typeof latitude === "number" && typeof longitude === "number";
  const region = hasSingleMarker
    ? { latitude, longitude, latitudeDelta: 0.025, longitudeDelta: 0.025 }
    : markers[0]?.latitude && markers[0]?.longitude
      ? { latitude: markers[0].latitude, longitude: markers[0].longitude, latitudeDelta: 0.09, longitudeDelta: 0.09 }
      : oxford;

  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface">
      <View className="h-56 overflow-hidden rounded-t-card bg-stone">
        <MapView
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={region}
          scrollEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          zoomEnabled={false}
          style={{ flex: 1 }}
        >
          {hasSingleMarker ? (
            <Marker coordinate={{ latitude, longitude }} title={location} />
          ) : null}
          {markers.map((entry) => (
            <Marker
              key={entry.id}
              coordinate={{ latitude: entry.latitude as number, longitude: entry.longitude as number }}
              title={entry.title}
              description={entry.location}
            />
          ))}
        </MapView>
      </View>
      <View className="p-5">
        <AppText variant="eyebrow">Map</AppText>
        <AppText className="mt-2 text-ink/70">
          {hasSingleMarker || markers.length > 0
            ? "Completed quests become a quiet atlas of places that mattered."
            : "Add a location when completing a quest to place this memory on your map."}
        </AppText>
      </View>
    </View>
  );
}
