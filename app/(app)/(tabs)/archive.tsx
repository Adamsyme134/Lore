import { View } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { LoreEntryCard } from "../../../src/features/lore/components/LoreEntryCard";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
import { PointsPill } from "../../../src/features/points/components/PointsPill";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LoreCard } from "../../../src/features/lore/components/LoreCard";
export default function ArchiveScreen() {
  const router = useRouter();
  const { data: loreEntries } = useLoreEntries();
  if (!loreEntries) {
  return null;
}
  const totalPoints = loreEntries.reduce((sum, entry) => sum + entry.pointsAwarded, 0);

  return (
    <Screen contentClassName="pt-3">
      <View className="mb-6">
        <AppText variant="eyebrow">Lore archive</AppText>
        <AppText variant="display" className="mt-2">Proof you were here.</AppText>
        <AppText className="mt-4 max-w-[320px]">
          Completed quests become entries: photos, place, people and a few honest lines about what happened.
        </AppText>
      </View>

      <View className="mb-5 rounded-card border border-line bg-surface p-5">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <AppText variant="eyebrow">This life, collected</AppText>
            <AppText variant="subtitle" className="mt-1">{loreEntries.length} entries captured</AppText>
            <AppText className="mt-2 text-ink/65">Points are a quiet measure of experiences completed, not a score to compare.</AppText>
          </View>
          <PointsPill points={totalPoints} />
        </View>
      </View>

      <SectionHeader eyebrow="Recent" title="Memory roll" />
      
      {/* 3-Wide Flex Grid with Scaled Lore Cards */}
      <View className="flex-row flex-wrap -mx-[1px] mt-2">
        {loreEntries.map((entry) => (
          <View 
            key={entry.id} 
            className="w-1/3 aspect-[3/4] p-[1px] items-center justify-center overflow-hidden"
          >
            <TouchableOpacity 
              onPress={() => router.push(`/lore/${entry.id}`)}
              activeOpacity={0.8}
              // ✨ Render at 3x size, then shrink by 66% so it fits perfectly
              style={{
                width: '300%',
                height: '300%',
                transform: [{ scale: 0.3333 }]
              }}
            >
              {/* Renders the full card layout without breaking text wrapping */}
              <View pointerEvents="none" className="w-full h-full rounded-2xl overflow-hidden">
                <LoreCard 
                  heroImageUri={entry.imageUrl}
                  title={entry.questTitle}
                  caption={entry.excerpt}
                  locationName={entry.location}
                />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </Screen>
  );
}
