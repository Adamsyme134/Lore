import { ActivityIndicator, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";

import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { LoreEntryCard } from "../../../src/features/lore/components/LoreEntryCard";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { useLoreEntriesForUser } from "../../../src/features/lore/api/loreApi";
import { useFriendInProgressQuests, useFriendProfile } from "../../../src/features/social/api/socialApi";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";

function ProfileAvatar({ avatarUrl, fullName }: { avatarUrl?: string | null; fullName: string }) {
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} className="h-20 w-20 rounded-full bg-stone" contentFit="cover" />;
  }

  return (
    <View className="h-20 w-20 items-center justify-center rounded-full bg-orange">
      <AppText className="font-sansSemi text-3xl text-ivory">
        {fullName.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

export default function FriendProfileScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileQuery = useFriendProfile(id);
  const loreQuery = useLoreEntriesForUser(id);
  const questsQuery = useFriendInProgressQuests(id);
  const profile = profileQuery.data;

  if (profileQuery.isLoading) {
    return (
      <Screen>
        <TopBar showBack title="Friend" />
        <ActivityIndicator className="mt-8" color={colors.accent} />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <TopBar showBack title="Friend" />
        <AppText variant="title">Profile not found.</AppText>
      </Screen>
    );
  }

  return (
    <Screen contentClassName="pb-36">
      <TopBar showBack title="Friend" />

      <View className="items-center pt-2">
        <ProfileAvatar avatarUrl={profile.avatarUrl} fullName={profile.fullName} />
        <AppText variant="title" className="mt-4 text-center">{profile.fullName}</AppText>
        <AppText variant="caption" className="mt-1 text-muted">@{profile.handle}</AppText>
        <AppText variant="caption" className="mt-3 font-sansSemi text-burgundy">{profile.pointsTotal} pts</AppText>
      </View>

      <SectionHeader eyebrow="Completed lore" title="Lore" />
      {loreQuery.isLoading ? (
        <ActivityIndicator className="mt-2" color={colors.accent} />
      ) : loreQuery.data && loreQuery.data.length > 0 ? (
        <View>
          {loreQuery.data.map((entry) => (
            <LoreEntryCard key={entry.id} entry={entry} />
          ))}
        </View>
      ) : (
        <AppText className="text-muted">No completed lore yet.</AppText>
      )}

      <SectionHeader eyebrow="In progress" title="Quests" />
      {questsQuery.isLoading ? (
        <ActivityIndicator className="mt-2" color={colors.accent} />
      ) : questsQuery.data && questsQuery.data.length > 0 ? (
        <View className="gap-4">
          {questsQuery.data.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </View>
      ) : (
        <AppText className="text-muted">No quests in progress.</AppText>
      )}
    </Screen>
  );
}
