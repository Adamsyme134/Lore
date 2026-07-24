import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import {
  useAddFriendGroupMember,
  useDeleteFriendGroup,
  useFriendGroupLeaderboard,
  useFriendGroups,
  useFriendsList,
  useLeaveFriendGroup,
  useRemoveFriendGroupMember,
  useRemoveFriendGroupQuest,
  useRenameFriendGroup,
  type FriendGroup,
  type LeaderboardFilter
} from "../../../src/features/social/api/socialApi";
import type { Profile } from "../../../src/shared/types/domain";

const leaderboardFilters: { label: string; value: LeaderboardFilter }[] = [
  { label: "All time", value: "all_time" },
  { label: "Year", value: "year" },
  { label: "Month", value: "month" }
];

function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    (globalThis as any).alert?.(message ? `${title}\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}

function formatGroupMeta(group: FriendGroup) {
  return `${group.members.length} member${group.members.length === 1 ? "" : "s"}, ${group.quests.length} quest${group.quests.length === 1 ? "" : "s"}`;
}

function MemberAvatar({ member, faded = false }: { member: Profile; faded?: boolean }) {
  return (
    <View
      className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-surface bg-orange"
      style={{ opacity: faded ? 0.45 : 1 }}
    >
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} className="h-full w-full" contentFit="cover" />
      ) : (
        <AppText className="font-sansSemi text-ivory">
          {member.fullName.charAt(0).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

function MemberAvatarRow({ members }: { members: Profile[] }) {
  const maxVisible = 6;
  const hasOverflow = members.length > maxVisible;
  const visibleMembers = hasOverflow ? members.slice(0, maxVisible) : members;

  return (
    <View className="flex-row items-center">
      {visibleMembers.map((member, index) => {
        const shouldFade = hasOverflow && index === visibleMembers.length - 1;
        return (
          <View key={member.id} className={index === 0 ? "" : "-ml-2"}>
            <MemberAvatar member={member} faded={shouldFade} />
            {shouldFade ? (
              <LinearGradient
                colors={["rgba(246, 245, 242, 0)", "rgba(246, 245, 242, 0.9)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 24, borderRadius: 20 }}
              />
            ) : null}
          </View>
        );
      })}
      {hasOverflow ? (
        <View className="-ml-1 h-10 w-10 items-center justify-center rounded-full border-2 border-surface bg-background">
          <AppText className="font-sansSemi text-[15px] text-ink/55">...</AppText>
        </View>
      ) : null}
    </View>
  );
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const { user } = useAuth();
  const { data: groups = [], isLoading: isLoadingGroups } = useFriendGroups();
  const { data: friends = [] } = useFriendsList();
  const group = groups.find((item) => item.id === id);
  const isOwner = group?.ownerId === user?.id;
  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardFilter>("all_time");
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [bannerValue, setBannerValue] = useState("");
  const [selectedBannerAsset, setSelectedBannerAsset] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const renameGroup = useRenameFriendGroup();
  const addMember = useAddFriendGroupMember();
  const removeMember = useRemoveFriendGroupMember();
  const removeQuest = useRemoveFriendGroupQuest();
  const deleteGroup = useDeleteFriendGroup();
  const leaveGroup = useLeaveFriendGroup();
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useFriendGroupLeaderboard(group, leaderboardFilter);
  const memberIds = useMemo(() => new Set(group?.members.map((member) => member.id) ?? []), [group?.members]);
  const availableFriends = friends.filter((friend) => !memberIds.has(friend.id));

  const openEdit = () => {
    if (!group) return;
    setNameValue(group.name);
    setBannerValue(group.bannerImageUrl ?? "");
    setSelectedBannerAsset(null);
    setIsEditOpen(true);
  };

  const pickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedBannerAsset({ uri: asset.uri, mimeType: asset.mimeType });
    }
  };

  const handleSaveGroup = () => {
    if (!group) return;

    renameGroup.mutate(
      {
        groupId: group.id,
        name: nameValue,
        bannerImageUrl: bannerValue,
        bannerAsset: selectedBannerAsset ?? undefined
      },
      {
        onSuccess: () => {
          setSelectedBannerAsset(null);
          setIsEditOpen(false);
        },
        onError: (error) => notify("Could not update group", error instanceof Error ? error.message : "Please try again.")
      }
    );
  };

  const handleDeleteGroup = () => {
    if (!group) return;

    const deleteCurrentGroup = () => {
      deleteGroup.mutate(group.id, {
        onSuccess: () => router.replace("/(app)/(tabs)/friends"),
        onError: (error) => notify("Could not delete group", error instanceof Error ? error.message : "Please try again.")
      });
    };

    if (Platform.OS === "web") {
      if ((globalThis as any).confirm?.(`Delete ${group.name}?`) !== false) {
        deleteCurrentGroup();
      }
      return;
    }

    Alert.alert(
      "Delete group?",
      "This removes the group for everyone. It will not delete any quests.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: deleteCurrentGroup }
      ]
    );
  };

  const handleLeaveGroup = () => {
    if (!group) return;

    const leaveCurrentGroup = () => {
      leaveGroup.mutate(group.id, {
        onSuccess: () => router.replace("/(app)/(tabs)/friends"),
        onError: (error) => notify("Could not leave group", error instanceof Error ? error.message : "Please try again.")
      });
    };

    if (Platform.OS === "web") {
      if ((globalThis as any).confirm?.(`Leave ${group.name}?`) !== false) {
        leaveCurrentGroup();
      }
      return;
    }

    Alert.alert(
      "Leave group?",
      "This removes the group from your Friends page. It will not delete the group for anyone else.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: leaveCurrentGroup }
      ]
    );
  };

  if (isLoadingGroups) {
    return (
      <Screen contentClassName="px-5 pb-20">
        <TopBar showBack title="Group" />
        <ActivityIndicator className="mt-10" color={colors.accent} />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen contentClassName="px-5 pb-20">
        <TopBar showBack title="Group" />
        <View className="mt-8 rounded-[28px] border border-line bg-surface p-6">
          <AppText variant="subtitle">Group not found</AppText>
          <AppText className="mt-2 text-muted">This circle may have been removed or you may no longer have access.</AppText>
          <Button label="Back to friends" variant="secondary" className="mt-5" onPress={() => router.replace("/(app)/(tabs)/friends")} />
        </View>
      </Screen>
    );
  }

  const bannerImageUrl = group.bannerImageUrl ?? undefined;
  const hasBanner = !!bannerImageUrl;
  const editPreviewUrl = selectedBannerAsset?.uri ?? (bannerValue.trim() || undefined);

  return (
    <Screen contentClassName="px-5 pb-20">
      <TopBar showBack title="Group" />

      <View className="overflow-hidden rounded-[28px] border border-line bg-surface">
        <View className="min-h-[190px] justify-end p-5">
          {hasBanner ? (
            <>
              <Image source={{ uri: bannerImageUrl }} className="absolute inset-0 h-full w-full bg-stone" contentFit="cover" />
              <View className="absolute inset-0 bg-black/35" />
            </>
          ) : null}
          <View className="flex-row items-end justify-between">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center">
                <AppText variant="display" className={hasBanner ? "text-ivory" : "text-ink"} numberOfLines={2}>
                  {group.name}
                </AppText>
                {isOwner ? (
                  <TouchableOpacity
                    onPress={openEdit}
                    className={`ml-3 h-9 w-9 items-center justify-center rounded-full border ${hasBanner ? "border-white/30 bg-black/20" : "border-line bg-background"}`}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil" size={17} color={hasBanner ? "#F6F5F2" : colors.text} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <AppText variant="caption" className={`mt-2 ${hasBanner ? "text-ivory/75" : "text-muted"}`}>
                {formatGroupMeta(group)}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row items-center">
        <View className="flex-1">
          <MemberAvatarRow members={group.members} />
        </View>
        {isOwner ? (
          <TouchableOpacity
            onPress={() => setIsMembersOpen(true)}
            className="ml-3 h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mt-6">
        <View className="flex-row rounded-full border border-line bg-background p-1">
          {leaderboardFilters.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              onPress={() => setLeaderboardFilter(filter.value)}
              className={`flex-1 items-center rounded-full py-2 ${leaderboardFilter === filter.value ? "bg-accent" : "bg-transparent"}`}
            >
              <AppText className={`font-sansSemi text-[11px] ${leaderboardFilter === filter.value ? "text-accentText" : "text-muted"}`}>
                {filter.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-4 gap-3">
          {isLoadingLeaderboard ? (
            <ActivityIndicator color={colors.accent} />
          ) : leaderboard.length > 0 ? (
            leaderboard.map((member, index) => (
              <View key={member.id} className="flex-row items-center">
                <AppText className="w-7 font-serif text-[20px] text-tertiary">{index + 1}</AppText>
                <MemberAvatar member={member} />
                <View className="ml-3 flex-1">
                  <AppText className="font-sansSemi text-[14px] text-ink">{member.fullName}</AppText>
                  <AppText variant="caption" className="text-tertiary">@{member.handle}</AppText>
                </View>
                <AppText className="font-sansSemi text-[13px] text-burgundy">{member.points} pts</AppText>
              </View>
            ))
          ) : (
            <AppText className="text-muted">No lore points yet.</AppText>
          )}
        </View>
      </View>

      <View className="mt-6 border-t border-line pt-4">
        <AppText variant="eyebrow" className="mb-3">Group quests</AppText>
        <View className="gap-4">
          {group.quests.length > 0 ? (
            group.quests.map((quest) => (
              <View key={quest.id} className="relative">
                <QuestCard
                  quest={quest}
                  groupId={group.id}
                  onRemove={() => removeQuest.mutate({ groupId: group.id, questId: quest.id })}
                />
              </View>
            ))
          ) : (
            <AppText className="text-muted">No quests added yet.</AppText>
          )}
        </View>

        {isOwner ? (
          <Button
            label="Add another quest"
            variant="secondary"
            className="mt-4"
            onPress={() => router.push("/(app)/(tabs)/explore")}
          />
        ) : null}
      </View>

      <View className="mt-8 border-t border-line pt-5">
        {isOwner ? (
            <Button
              label={deleteGroup.isPending ? "Deleting..." : "Delete group"}
              variant="secondary"
              onPress={handleDeleteGroup}
              disabled={deleteGroup.isPending}
            />
        ) : (
          <Button
            label={leaveGroup.isPending ? "Leaving..." : "Leave group"}
            variant="secondary"
            onPress={handleLeaveGroup}
            disabled={leaveGroup.isPending}
          />
        )}
      </View>

      <Modal visible={isMembersOpen} transparent animationType="fade" onRequestClose={() => setIsMembersOpen(false)}>
        <View className="flex-1 justify-end bg-black/30">
          <View className="max-h-[82%] rounded-t-[28px] bg-surface p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="subtitle">People</AppText>
              <TouchableOpacity onPress={() => setIsMembersOpen(false)} className="h-9 w-9 items-center justify-center rounded-full bg-background">
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="gap-3">
                {group.members.map((member) => (
                  <View key={member.id} className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <MemberAvatar member={member} />
                      <View className="ml-3">
                        <AppText className={member.id === user?.id ? "font-sansSemi text-ink" : "text-ink/75"}>
                          {member.id === user?.id ? "You" : member.fullName}
                        </AppText>
                        <AppText variant="caption" className="text-tertiary">@{member.handle}</AppText>
                      </View>
                    </View>
                    {member.id !== group.ownerId ? (
                      <TouchableOpacity onPress={() => removeMember.mutate({ groupId: group.id, userId: member.id })}>
                        <AppText className="font-sansSemi text-[12px] text-tertiary">Remove</AppText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>

              {availableFriends.length > 0 ? (
                <View className="mt-6 border-t border-line pt-4">
                  <AppText variant="eyebrow" className="mb-3">Add people</AppText>
                  <View className="flex-row flex-wrap gap-2">
                    {availableFriends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        onPress={() => addMember.mutate({ groupId: group.id, userId: friend.id })}
                        className="rounded-full border border-line bg-background px-3 py-2"
                      >
                        <AppText className="font-sansSemi text-[12px] text-ink">+ {friend.fullName}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={isEditOpen} transparent animationType="fade" onRequestClose={() => setIsEditOpen(false)}>
        <View className="flex-1 justify-end bg-black/30">
          <View className="rounded-t-[28px] bg-surface p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <AppText variant="subtitle">Edit group</AppText>
              <TouchableOpacity onPress={() => setIsEditOpen(false)} className="h-9 w-9 items-center justify-center rounded-full bg-background">
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={nameValue}
              onChangeText={setNameValue}
              placeholder="Group name"
              placeholderTextColor={colors.textTertiary}
              className="rounded-2xl border border-line bg-background px-4 py-3 font-sans text-[15px] text-ink"
            />
            <TextInput
              value={bannerValue}
              onChangeText={(value) => {
                setSelectedBannerAsset(null);
                setBannerValue(value);
              }}
              autoCapitalize="none"
              placeholder="Banner image URL"
              placeholderTextColor={colors.textTertiary}
              className="mt-3 rounded-2xl border border-line bg-background px-4 py-3 font-sans text-[15px] text-ink"
            />
            {editPreviewUrl ? (
              <View className="mt-3 h-28 overflow-hidden rounded-[18px] bg-stone">
                <Image source={{ uri: editPreviewUrl }} className="h-full w-full" contentFit="cover" />
              </View>
            ) : null}
            <View className="mt-3 flex-row gap-3">
              <TouchableOpacity
                onPress={pickBanner}
                className="flex-1 items-center rounded-full border border-line bg-background py-3"
              >
                <AppText className="font-sansSemi text-[13px] text-ink">Choose image</AppText>
              </TouchableOpacity>
              {editPreviewUrl ? (
                <TouchableOpacity
                  onPress={() => {
                    setBannerValue("");
                    setSelectedBannerAsset(null);
                  }}
                  className="flex-1 items-center rounded-full border border-line bg-background py-3"
                >
                  <AppText className="font-sansSemi text-[13px] text-muted">Remove banner</AppText>
                </TouchableOpacity>
              ) : null}
            </View>
            <Button
              label={renameGroup.isPending ? "Saving..." : "Save changes"}
              className="mt-5"
              onPress={handleSaveGroup}
              disabled={renameGroup.isPending || !nameValue.trim()}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
