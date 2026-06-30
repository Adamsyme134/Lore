import { View } from "react-native";
import { Screen } from "../../src/shared/components/Screen";
import { AppText } from "../../src/shared/components/AppText";
import { TopBar } from "../../src/shared/components/TopBar";
import { Button } from "../../src/shared/components/Button";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { useExperienceStore } from "src/features/app/store/useExperienceStore";

// Simple leveling formula: 1 level per 50 points
function calculateLevel(points: number) {
  const level = Math.floor(points / 50) + 1;
  const nextLevelThreshold = level * 50;
  const pointsNeeded = nextLevelThreshold - points;
  
  return { level, pointsNeeded, nextLevelThreshold };
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const { level, pointsNeeded } = calculateLevel(profile.pointsTotal);

  return (
    <Screen contentClassName="pt-3">
      <TopBar showBack title="Explorer Profile" />
      
      <View className="mt-8 items-center px-5">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-burgundy mb-4">
          <AppText variant="display" className="text-ivory text-4xl">
            {profile.fullName.charAt(0).toUpperCase()}
          </AppText>
        </View>
        <AppText variant="display">{profile.fullName}</AppText>
        <AppText className="text-ink/60 mt-1">@{profile.handle}</AppText>
      </View>

      <View className="mt-10 px-5">
        <View className="rounded-card border border-line bg-cream p-5">
          <AppText variant="eyebrow" className="mb-2">Lore Mastery</AppText>
          <View className="flex-row items-end justify-between border-b border-line pb-4">
            <AppText variant="title">Level {level}</AppText>
            <AppText variant="subtitle" className="text-burgundy">{profile.pointsTotal} pts</AppText>
          </View>
          <AppText className="mt-4 text-ink/80">
            You need <AppText className="font-sansSemi">{pointsNeeded} more points</AppText> to reach Level {level + 1}. Complete quests and add photos to your entries to level up.
          </AppText>
        </View>
      </View>

      <View className="mt-auto px-5 pb-8 pt-10">
        <Button label="Sign Out" variant="secondary" onPress={signOut} />
      </View>
      <Button 
  label="Reset All Step Progress" 
  onPress={() => useExperienceStore.setState({ activeQuests: {} })} 
/>
    </Screen>
  );
}