import { View } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { useLoreEntries } from "../../../src/features/lore/api/loreApi";
import { TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { LoreCard } from "../../../src/features/lore/components/LoreCard";
export default function ArchiveScreen() {
  const router = useRouter();
  const { data: loreEntries } = useLoreEntries();
  if (!loreEntries) {
  return null;
}
  return (
    <Screen contentClassName="pt-3">
      <View className="mb-6">
        <AppText variant="display">My lore</AppText>
      </View>

      <SectionHeader eyebrow="Recent" title="Memory roll" />
      
      {/* 3-Wide Flex Grid with Scaled Lore Cards */}
      <View className="flex-row flex-wrap -mx-[1px] mt-2">
        {loreEntries.map((entry) => (
          <View 
            key={entry.id} 
            className="relative w-1/3 aspect-[3/4] p-[1px] items-center justify-center overflow-hidden"
          >
            <TouchableOpacity 
              onPress={() => router.push(`/lore/${entry.id}`)}
              activeOpacity={0.8}
              className="h-full w-full"
            >
              {/* Renders the full card layout without breaking text wrapping */}
              <View
                pointerEvents="none"
                className="absolute rounded-2xl overflow-hidden"
                // ✨ Render at 3x size, then shrink by 66% so it fits perfectly
              style={{
                position: 'absolute',
                left: '-100%',
                top: '-100%',
                width: '300%',
                height: '300%',
                transform: [{ scale: 0.3333 }]
              }}
            >
                <LoreCard 
                  heroImageUri={entry.imageUrl}
                  title={entry.questTitle}
                  caption={entry.excerpt}
                  locationName={entry.location}
                  extraQuestCount={entry.autoCompletedQuests?.length || 0}
                />
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </Screen>
  );
}
