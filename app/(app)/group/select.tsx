// app/(app)/group/select.tsx
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { useQuest } from "../../../src/features/quests/api/questApi";
import { useCreateGroupQuestInvites } from "../../../src/features/quests/api/groupQuestApi";
import { useFriendsList } from "../../../src/features/social/api/socialApi";

export default function GroupSelectScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const { data: quest } = useQuest(questId);
  const { data: friends = [], isLoading } = useFriendsList();
  const createInvites = useCreateGroupQuestInvites();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isGroupOnly = (quest?.minParticipants ?? 1) > 1;
  const selectedCount = selectedIds.size;
  const neededFriends = Math.max(1, (quest?.minParticipants ?? 2) - 1);
  const canSend = selectedCount >= (isGroupOnly ? neededFriends : 1);

  const helperText = useMemo(() => {
    if (!quest) return "Choose friends to invite into this quest.";
    if (isGroupOnly) {
      return `This quest needs at least ${quest.minParticipants} people. Invite ${neededFriends} friend${neededFriends === 1 ? "" : "s"} or more to begin.`;
    }
    return "Invite friends to do this quest together. You can still make progress while they decide.";
  }, [isGroupOnly, neededFriends, quest]);

  const toggleFriend = (friendId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleSend = () => {
    if (!quest || !canSend) {
      Alert.alert(
        "Choose your group",
        isGroupOnly ? `This quest needs ${quest?.minParticipants ?? 2} people before it can be completed.` : "Pick at least one friend to invite."
      );
      return;
    }

    createInvites.mutate(
      { questId: quest.id, receiverIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          Alert.alert("Invites sent", "Your friends will see this quest at the top of their Friends tab.");
          router.replace({ pathname: "/quest/[id]", params: { id: quest.id } });
        },
        onError: (error) => {
          Alert.alert("Could not send invites", error instanceof Error ? error.message : "Please try again.");
        }
      }
    );
  };

  return (
    <Screen>
      <TopBar showBack title="Group Quest" />
      <View className="px-5 pt-4 pb-8">
        <AppText variant="display" className="text-ink">Who is joining you?</AppText>
        <AppText className="mt-4 text-ink/70">
          {helperText}
        </AppText>

        {quest ? (
          <View className="mt-5 rounded-[24px] border border-line bg-surface p-4">
            <AppText variant="eyebrow" className="text-ink/50">Quest</AppText>
            <AppText variant="subtitle" className="mt-1 text-ink">{quest.title}</AppText>
            <AppText variant="caption" className="mt-2 text-ink/60">
              {quest.length} · {quest.difficulty} · {quest.cost}
            </AppText>
          </View>
        ) : null}

        <View className="mt-6">
          <View className="mb-3 flex-row items-center justify-between">
            <AppText variant="subtitle">Friends</AppText>
            <AppText variant="caption" className="font-sansSemi text-ink/60">
              {selectedCount} selected
            </AppText>
          </View>

          {isLoading ? (
            <ActivityIndicator className="py-10" color="#2c2a25" />
          ) : friends.length > 0 ? (
            <View className="rounded-[28px] border border-line bg-surface overflow-hidden">
              {friends.map((friend, index) => {
                const isSelected = selectedIds.has(friend.id);
                return (
                  <Pressable
                    key={friend.id}
                    onPress={() => toggleFriend(friend.id)}
                    className={`flex-row items-center px-4 py-4 ${index > 0 ? "border-t border-line" : ""}`}
                  >
                    {friend.avatarUrl ? (
                      <Image source={{ uri: friend.avatarUrl }} className="h-12 w-12 rounded-full bg-stone" contentFit="cover" />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-orange">
                        <AppText className="font-sansSemi text-lg text-ivory">
                          {friend.fullName.charAt(0).toUpperCase()}
                        </AppText>
                      </View>
                    )}
                    <View className="ml-4 flex-1">
                      <AppText className="font-sansSemi text-[16px]" numberOfLines={1}>{friend.fullName}</AppText>
                      <AppText variant="caption" className="text-ink/60">@{friend.handle}</AppText>
                    </View>
                    <View className={`h-8 w-8 items-center justify-center rounded-full border ${isSelected ? "border-forest bg-forest" : "border-line bg-background"}`}>
                      {isSelected ? <Ionicons name="checkmark" size={18} color="white" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="rounded-[28px] border border-dashed border-line bg-surface p-6">
              <AppText variant="subtitle" className="text-center text-ink">No friends yet</AppText>
              <AppText className="mt-2 text-center text-ink/60">
                Add friends first, then come back to start group quests together.
              </AppText>
              <Button label="Find friends" variant="secondary" className="mt-5" onPress={() => router.push("/(app)/(tabs)/friends")} />
            </View>
          )}
        </View>

        <View className="mt-8 gap-3">
          <Button
            label={createInvites.isPending ? "Sending..." : isGroupOnly ? "Start Group Quest" : "Add To Group"}
            onPress={handleSend}
            disabled={createInvites.isPending || !canSend}
            className={canSend ? "bg-orange" : "opacity-50"}
          />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
