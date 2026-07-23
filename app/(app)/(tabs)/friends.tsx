// app/(app)/(tabs)/friends.tsx
import { useMemo, useState } from "react";
import { Alert, Platform, TextInput, View, ActivityIndicator, Share, TouchableOpacity, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { SectionHeader } from "../../../src/shared/components/SectionHeader";
import { FriendMomentCard } from "../../../src/features/social/components/FriendMomentCard";
import { Button } from "../../../src/shared/components/Button";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { 
  useFriendMoments, 
  useSendFriendRequest, 
  useFriendsList,
  useSearchUsers,
  usePendingRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useAddFriendGroupMember,
  useCreateFriendGroup,
  useFriendGroupLeaderboard,
  useFriendGroups,
  useRemoveFriendGroupMember,
  useRemoveFriendGroupQuest,
  useRenameFriendGroup,
  type FriendGroup,
  type LeaderboardFilter
} from "../../../src/features/social/api/socialApi";
import {
  useAcceptGroupQuestInvite,
  useDeclineGroupQuestInvite,
  usePendingGroupQuestInvites
} from "../../../src/features/quests/api/groupQuestApi";
import { useRouter } from "expo-router";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import type { Profile } from "../../../src/shared/types/domain";

const leaderboardFilters: { label: string; value: LeaderboardFilter }[] = [
  { label: "All time", value: "all_time" },
  { label: "Year", value: "year" },
  { label: "Month", value: "month" }
];

function notify(message: string) {
  if (Platform.OS === "web") {
    (globalThis as any).alert?.(message);
    return;
  }

  Alert.alert("Lore", message);
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

function MemberAvatarRow({
  members,
  onPress
}: {
  members: Profile[];
  onPress?: () => void;
}) {
  const maxVisible = 5;
  const hasOverflow = members.length > maxVisible;
  const visibleMembers = hasOverflow ? members.slice(0, maxVisible) : members;
  const content = (
    <View className="mt-4 flex-row items-center">
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

  if (!onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

function GroupCard({
  group,
  friends,
  currentUserId
}: {
  group: FriendGroup;
  friends: Profile[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const isOwner = group.ownerId === currentUserId;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMemberManagerOpen, setIsMemberManagerOpen] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState<LeaderboardFilter>("all_time");
  const [renameValue, setRenameValue] = useState(group.name);
  const renameGroup = useRenameFriendGroup();
  const addMember = useAddFriendGroupMember();
  const removeMember = useRemoveFriendGroupMember();
  const removeQuest = useRemoveFriendGroupQuest();
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useFriendGroupLeaderboard(group, leaderboardFilter);
  const memberIds = useMemo(() => new Set(group.members.map((member) => member.id)), [group.members]);
  const availableFriends = friends.filter((friend) => !memberIds.has(friend.id));

  return (
    <View className="rounded-[22px] border border-line bg-surface p-4">
      <Pressable onPress={() => setIsExpanded((current) => !current)}>
        <View className="flex-1 pr-3">
          <AppText variant="title">{group.name}</AppText>
          <AppText variant="caption" className="mt-2 text-ink/55">
            {formatGroupMeta(group)}
          </AppText>
          <MemberAvatarRow members={group.members} />
        </View>
      </Pressable>

      {isExpanded ? (
        <View className="mt-5 border-t border-line pt-4">
          {isOwner ? (
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              onEndEditing={() => {
                if (renameValue.trim() && renameValue.trim() !== group.name) {
                  renameGroup.mutate({ groupId: group.id, name: renameValue });
                }
              }}
              className="border-b border-line pb-2 font-serif text-[24px] leading-8 text-ink"
              placeholder="Group name"
              placeholderTextColor="#787267"
            />
          ) : null}

          <MemberAvatarRow members={group.members} onPress={() => setIsMemberManagerOpen((current) => !current)} />

          {isMemberManagerOpen ? (
            <View className="mt-4 gap-2">
              {group.members.map((member) => (
                <View key={member.id} className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MemberAvatar member={member} />
                    <View className="ml-3">
                      <AppText className={member.id === currentUserId ? "font-sansSemi text-ink" : "text-ink/75"}>
                        {member.id === currentUserId ? "You" : member.fullName}
                      </AppText>
                      <AppText variant="caption" className="text-ink/50">@{member.handle}</AppText>
                    </View>
                  </View>
                  {isOwner && member.id !== group.ownerId ? (
                    <TouchableOpacity onPress={() => removeMember.mutate({ groupId: group.id, userId: member.id })}>
                      <AppText className="font-sansSemi text-[12px] text-ink/45">Remove</AppText>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}

              {isOwner && availableFriends.length > 0 ? (
                <View className="mt-3 flex-row flex-wrap gap-2">
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
              ) : null}
            </View>
          ) : null}

          <View className="mt-6">
            <View className="flex-row rounded-full border border-line bg-background p-1">
              {leaderboardFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  onPress={() => setLeaderboardFilter(filter.value)}
                  className={`flex-1 items-center rounded-full py-2 ${leaderboardFilter === filter.value ? "bg-ink" : "bg-transparent"}`}
                >
                  <AppText className={`font-sansSemi text-[11px] ${leaderboardFilter === filter.value ? "text-ivory" : "text-ink/60"}`}>
                    {filter.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mt-4 gap-3">
              {isLoadingLeaderboard ? (
                <ActivityIndicator color="#2c2a25" />
              ) : leaderboard.length > 0 ? (
                leaderboard.map((member, index) => (
                  <View key={member.id} className="flex-row items-center">
                    <AppText className="w-7 font-serif text-[20px] text-ink/40">{index + 1}</AppText>
                    <MemberAvatar member={member} />
                    <View className="ml-3 flex-1">
                      <AppText className="font-sansSemi text-[14px] text-ink">{member.fullName}</AppText>
                      <AppText variant="caption" className="text-ink/50">@{member.handle}</AppText>
                    </View>
                    <AppText className="font-sansSemi text-[13px] text-burgundy">{member.points} pts</AppText>
                  </View>
                ))
              ) : (
                <AppText className="text-ink/55">No lore points yet.</AppText>
              )}
            </View>
          </View>

          <View className="mt-6 border-t border-line pt-4">
            <AppText variant="eyebrow" className="mb-3">Group quests</AppText>
            <View className="gap-4">
              {group.quests.length > 0 ? (
                group.quests.map((quest) => (
                  <View key={quest.id}>
                    <QuestCard quest={quest} />
                    {isOwner ? (
                      <TouchableOpacity
                        onPress={() => removeQuest.mutate({ groupId: group.id, questId: quest.id })}
                        className="mt-2 self-end rounded-full border border-line bg-background px-3 py-2"
                      >
                        <AppText className="font-sansSemi text-[12px] text-ink/45">Remove</AppText>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              ) : (
                <AppText className="text-ink/55">No quests added yet.</AppText>
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
        </View>
      ) : null}
    </View>
  );
}

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: friendMoments } = useFriendMoments();
  const { data: friends, isLoading: isLoadingFriends } = useFriendsList();
  const { data: groupQuestInvites } = usePendingGroupQuestInvites();
  const { data: friendGroups, isLoading: isLoadingGroups } = useFriendGroups();
  
  // New API Hooks
  const { data: pendingRequests } = usePendingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const sendFriendRequest = useSendFriendRequest();
  const acceptGroupQuest = useAcceptGroupQuestInvite();
  const declineGroupQuest = useDeclineGroupQuestInvite();
  const createFriendGroup = useCreateFriendGroup();
  
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchQuery);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<Set<string>>(new Set());
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const handleShareAppInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on Lore! Download the app so we can make life more interesting: https://lore.app/invite',
        title: 'Invite Friends to Lore'
      });
    } catch (error) {
      console.error('Error sharing link', error);
    }
  };

  const handleSendRequest = (userId: string) => {
    sendFriendRequest.mutate(userId, {
      onSuccess: () => {
        setSentRequests(prev => new Set(prev).add(userId));
      }
    });
  };

  const handleToggleNewGroupMember = (userId: string) => {
    setNewGroupMemberIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreateGroup = () => {
    createFriendGroup.mutate(
      { name: newGroupName, memberIds: Array.from(newGroupMemberIds) },
      {
        onSuccess: () => {
          setNewGroupName("");
          setNewGroupMemberIds(new Set());
          setIsCreateGroupOpen(false);
          notify("Group created.");
        },
        onError: (error) => {
          console.error("Could not create friend group", error);
          notify(error instanceof Error ? error.message : "Could not create group.");
        }
      }
    );
  };

  return (
    <Screen contentClassName="pt-3 px-5 pb-20">
      <View className="mb-6">
        <AppText variant="eyebrow">People</AppText>
        <AppText variant="display" className="mt-2">Friends</AppText>
      </View>

      {/* GROUP QUEST INVITES */}
      {groupQuestInvites && groupQuestInvites.length > 0 && (
        <View className="mb-8">
          <SectionHeader eyebrow="Group quests" title="Invites waiting" />
          <View className="mt-2 gap-4">
            {groupQuestInvites.map((invite) => (
              <View key={invite.id} className="overflow-hidden rounded-[28px] border border-line bg-surface">
                <View className="relative h-44">
                  <Image source={{ uri: invite.quest.imageUrl }} className="h-full w-full bg-stone" contentFit="cover" />
                  <View className="absolute inset-0 bg-black/35" />
                  <View className="absolute bottom-0 left-0 right-0 p-5">
                    <AppText variant="eyebrow" className="text-ivory/75">
                      {invite.sender.fullName} invited you
                    </AppText>
                    <AppText variant="title" className="mt-1 text-ivory" numberOfLines={2}>
                      {invite.quest.title}
                    </AppText>
                  </View>
                </View>

                <View className="border-t border-line p-4">
                  <View className="mb-4 flex-row justify-between">
                    <AppText variant="caption" className="font-sansSemi text-ink/60">{invite.quest.length}</AppText>
                    <AppText variant="caption" className="font-sansSemi text-ink/60">{invite.quest.difficulty}</AppText>
                    <AppText variant="caption" className="font-sansSemi text-ink/60">{invite.quest.cost}</AppText>
                  </View>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => declineGroupQuest.mutate(invite.id)}
                      className="flex-1 items-center rounded-full border border-line bg-background py-3"
                      disabled={declineGroupQuest.isPending}
                    >
                      <AppText variant="caption" className="font-sansBold uppercase tracking-editorial text-ink">
                        Decline
                      </AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        acceptGroupQuest.mutate(invite.id, {
                          onSuccess: (questId) => {
                            if (questId) router.push({ pathname: "/quest/[id]", params: { id: questId } });
                          }
                        });
                      }}
                      className="flex-1 items-center rounded-full bg-forest py-3"
                      disabled={acceptGroupQuest.isPending}
                    >
                      <AppText variant="caption" className="font-sansBold uppercase tracking-editorial text-ivory">
                        Join
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* PENDING REQUESTS */}
      {pendingRequests && pendingRequests.length > 0 && (
        <View className="mb-8">
          <SectionHeader eyebrow="Requests" title="Awaiting response" />
          <View className="space-y-3 mt-2">
            {pendingRequests.map(req => (
              <View key={req.id} className="flex-row items-center justify-between border-b border-line pb-4 pt-2">
                <View className="flex-row items-center flex-1 pr-4">
                   <View className="h-10 w-10 items-center justify-center rounded-full bg-orange">
                    <AppText className="font-sansSemi text-ivory text-base">
                      {req.requester.full_name.charAt(0).toUpperCase()}
                    </AppText>
                   </View>
                   <View className="ml-3 flex-1">
                     <AppText className="font-sansSemi" numberOfLines={1}>{req.requester.full_name}</AppText>
                     <AppText variant="caption" className="text-ink/60">@{req.requester.handle}</AppText>
                   </View>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => declineRequest.mutate(req.id)}
                    className="rounded-full bg-line px-4 py-2"
                  >
                    <AppText className="font-sansSemi text-[14px]">Decline</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => acceptRequest.mutate(req.id)}
                    className="ml-2 rounded-full bg-forest px-4 py-2"
                  >
                    <AppText className="font-sansSemi text-ivory text-[14px]">Accept</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* FRIEND GROUPS */}
      <View className="mb-8">
        <View className="mb-5 mt-8">
          <AppText variant="eyebrow" className="mb-2">Groups</AppText>
          <View className="flex-row items-center">
            <AppText variant="title">Small circles</AppText>
            <TouchableOpacity
              onPress={() => setIsCreateGroupOpen((current) => !current)}
              className="ml-3 h-9 w-9 items-center justify-center rounded-full border border-line bg-surface"
              activeOpacity={0.8}
            >
              <Ionicons name={isCreateGroupOpen ? "close" : "add"} size={20} color="#1C1A17" />
            </TouchableOpacity>
          </View>
        </View>

        {isCreateGroupOpen ? (
          <View className="rounded-[24px] border border-line bg-surface p-4">
            <AppText variant="subtitle" className="text-[17px]">Create a group</AppText>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Sunday walkers, film people..."
              placeholderTextColor="#787267"
              className="mt-4 rounded-2xl border border-line bg-background px-4 py-3 font-sans text-[15px] text-ink"
            />

            {friends && friends.length > 0 ? (
              <View className="mt-4 flex-row flex-wrap gap-2">
                {friends.map((friend) => {
                  const isSelected = newGroupMemberIds.has(friend.id);
                  return (
                    <TouchableOpacity
                      key={friend.id}
                      onPress={() => handleToggleNewGroupMember(friend.id)}
                      className={`rounded-full border px-3 py-2 ${isSelected ? "border-ink bg-ink" : "border-line bg-background"}`}
                    >
                      <AppText className={`font-sansSemi text-[12px] ${isSelected ? "text-ivory" : "text-ink"}`}>
                        {friend.fullName}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <AppText className="mt-3 text-ink/55">Add friends first, then gather them into groups.</AppText>
            )}

            <Button
              label={createFriendGroup.isPending ? "Creating..." : "Create group"}
              className="mt-5"
              onPress={handleCreateGroup}
              disabled={createFriendGroup.isPending || !newGroupName.trim()}
            />
          </View>
        ) : null}

        {isLoadingGroups ? (
          <ActivityIndicator className="mt-5" color="#2c2a25" />
        ) : friendGroups && friendGroups.length > 0 ? (
          <View className="mt-5 gap-4">
            {friendGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                friends={friends ?? []}
                currentUserId={user?.id}
              />
            ))}
          </View>
        ) : (
          <AppText className="mt-4 text-ink/55">
            No groups yet. Make one for the people you actually do things with.
          </AppText>
        )}
      </View>

      {/* FIND & INVITE CARD */}
      <View className="mb-8 rounded-card border border-line bg-surface p-5">
        <AppText variant="subtitle">Grow your circle</AppText>
        
        <Button 
          label="Share invite link" 
          className="mt-4" 
          variant="secondary" 
          onPress={handleShareAppInvite} 
        />

        <View className="my-5 h-[1px] w-full bg-line" />

        <TextInput
          autoCapitalize="none"
          placeholder="Search by name or @handle..."
          placeholderTextColor="#787267"
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="rounded-3xl border border-line bg-background px-5 py-4 font-sans text-[15px] text-ink"
        />

        {searchQuery.length >= 2 && (
          <View className="mt-4 space-y-3">
            {isSearching ? (
               <ActivityIndicator className="py-2" color="#2c2a25" />
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map(user => {
                const isSent = sentRequests.has(user.id);
                return (
                  <View key={user.id} className="flex-row items-center justify-between border-b border-line pb-3">
                    <View className="flex-1 pr-4">
                      <AppText className="font-sansSemi" numberOfLines={1}>{user.fullName}</AppText>
                      <AppText variant="caption" className="text-ink/60">@{user.handle}</AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() => !isSent && handleSendRequest(user.id)}
                      className={`rounded-full px-4 py-2 ${isSent ? 'bg-line' : 'bg-forest'}`}
                      disabled={isSent}
                    >
                      <AppText className={`font-sansSemi text-[14px] ${isSent ? 'text-ink' : 'text-ivory'}`}>
                        {isSent ? 'Sent' : 'Add'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <AppText className="text-ink/60 text-center py-2">No explorers found.</AppText>
            )}
          </View>
        )}
      </View>

      {/* ACTIVE FRIENDS */}
      <SectionHeader eyebrow="Your Circle" title="Active Explorers" />
      
      {isLoadingFriends ? (
        <ActivityIndicator className="mt-4" color="#2c2a25" />
      ) : friends && friends.length > 0 ? (
        <View className="mb-8 mt-2 space-y-4">
          {friends.map(friend => (
            <View key={friend.id} className="flex-row items-center border-b border-line pb-4 pt-2">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-orange">
                <AppText className="font-sansSemi text-ivory text-lg">
                  {friend.fullName.charAt(0).toUpperCase()}
                </AppText>
              </View>
              <View className="ml-4 flex-1">
                <AppText className="font-sansSemi text-[17px]">{friend.fullName}</AppText>
                <AppText variant="caption" className="text-ink/60">@{friend.handle}</AppText>
              </View>
              <AppText variant="caption" className="font-sansSemi text-burgundy">
                {friend.pointsTotal} pts
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <AppText className="mb-8 mt-2 text-ink/60">Your circle is currently empty.</AppText>
      )}

      {/* FRIEND LORE */}
      {friendMoments && friendMoments.length > 0 && (
  <>
    <SectionHeader eyebrow="Friend lore" title="Quiet inspiration" />
    {friendMoments.map((moment) => (
      <TouchableOpacity key={moment.id} onPress={() => router.push(`/lore/${moment.id}`)} activeOpacity={0.9}>
        <FriendMomentCard moment={moment} />
      </TouchableOpacity>
    ))}
  </>
)}
    </Screen>
  );
}
