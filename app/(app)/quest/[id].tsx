import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, View, Pressable, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { QuestDetailBlock } from "../../../src/features/quests/components/QuestDetailBlock";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";
import { useQuest, useSaveQuest, useActivateQuest, useQuitQuest, useTrackQuestView } from "../../../src/features/quests/api/questApi";
import { useGroupQuestProgress, useUpdateQuestStepProgress, useUserQuestState, type GroupQuestParticipant } from "../../../src/features/quests/api/groupQuestApi";
import { Ionicons } from '@expo/vector-icons'; 

import { QuestExecutionProvider } from "../../../src/features/quests/context/QuestExecutionContext";
import { QuestHero } from "../../../src/features/quests/components/QuestHero";
import { useAddFriendGroupQuest, useCreateFriendGroup, useFriendGroups, useFriendsList } from "../../../src/features/social/api/socialApi";

function SegmentedProgressBar({ completed, total }: { completed: number; total: number }) {
  const safeTotal = Math.max(total, 1);
  const safeCompleted = Math.min(completed, safeTotal);

  return (
    <View className="flex-row gap-1">
      {Array.from({ length: safeTotal }).map((_, index) => (
        <View key={index} className="h-[4px] flex-1 overflow-hidden rounded-full bg-line">
          <View className={`h-full ${index < safeCompleted ? "bg-ink dark:bg-ivory" : "bg-transparent"}`} />
        </View>
      ))}
    </View>
  );
}

function Avatar({ participant }: { participant: GroupQuestParticipant }) {
  if (participant.avatarUrl) {
    return <Image source={{ uri: participant.avatarUrl }} className="h-10 w-10 rounded-full bg-stone" contentFit="cover" />;
  }

  return (
    <View className="h-10 w-10 items-center justify-center rounded-full bg-orange">
      <AppText className="font-sansSemi text-ivory">
        {participant.fullName.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

function notify(message: string) {
  if (Platform.OS === "web") {
    (globalThis as any).alert?.(message);
    return;
  }

  Alert.alert("Lore", message);
}

export default function QuestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: quest } = useQuest(id);
  const { savedQuestIds, activeQuests, toggleQuestStep } = useExperienceStore();
  const saveQuest = useSaveQuest();
  const activateQuest = useActivateQuest();
  const quitQuest = useQuitQuest();
  const trackView = useTrackQuestView();
  const syncStepProgress = useUpdateQuestStepProgress();
  const { data: friendGroups = [] } = useFriendGroups();
  const { data: friends = [] } = useFriendsList();
  const createFriendGroup = useCreateFriendGroup();
  const addFriendGroupQuest = useAddFriendGroupQuest();
  const [isProgressExpanded, setIsProgressExpanded] = useState(true);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);
  const [newQuestGroupName, setNewQuestGroupName] = useState("");
  const [newQuestGroupMemberIds, setNewQuestGroupMemberIds] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const detailsSectionYRef = useRef(0);
  const detailBlockYRef = useRef(0);
  const stepsListYRef = useRef(0);
  const stepYRefs = useRef<Record<number, number>>({});
  const groupProgress = useGroupQuestProgress(quest?.id);
  const userQuestState = useUserQuestState(quest?.id);
  
  // Fire exactly once when the quest ID is resolved and opened
  useEffect(() => {
    if (quest?.id) {
      trackView.mutate(quest.id);
    }
  }, [quest?.id]);
  const insets = useSafeAreaInsets();
  const questId = quest?.id;
  const remoteCompletedSteps = userQuestState.data?.completedStepIndexes ?? [];
  const isActive = questId ? activeQuests[questId] !== undefined || userQuestState.data?.status === "active" : false;
  const checkedSteps = questId ? activeQuests[questId] ?? remoteCompletedSteps : [];
  const currentActiveStepIndex = quest && isActive && quest.steps.length > checkedSteps.length ? checkedSteps.length : null;

  const scrollToStep = useCallback((index: number) => {
    const stepY = stepYRefs.current[index];
    if (stepY === undefined) return;

    scrollViewRef.current?.scrollTo({
      y: Math.max(detailsSectionYRef.current + detailBlockYRef.current + stepsListYRef.current + stepY - 96, 0),
      animated: true
    });
  }, []);

  useEffect(() => {
    if (currentActiveStepIndex === null) {
      setExpandedStepIndex(null);
      return;
    }

    setExpandedStepIndex(currentActiveStepIndex);
    const scrollTimer = setTimeout(() => scrollToStep(currentActiveStepIndex), 260);

    return () => clearTimeout(scrollTimer);
  }, [currentActiveStepIndex, questId, scrollToStep]);

  if (!quest) {
    return (
      <Screen contentClassName="px-0">
        <View style={{ paddingTop: Math.max(insets.top, 20) }} className="px-5 pb-4">
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-surface">
            <Ionicons name="arrow-back" size={20} color="var(--color-text)" />
          </Pressable>
        </View>
        <AppText variant="title" className="px-5">Quest not found.</AppText>
      </Screen>
    );
  }

  const isSaved = savedQuestIds.includes(quest.id);
  const groupParticipants = groupProgress.data?.participants ?? [];
  const acceptedParticipantCount = Math.max(groupParticipants.length, isActive ? 1 : 0);
  const isGroupQuest = groupProgress.data?.hasGroup || quest.minParticipants > 1;
  const groupRequirementMet = quest.minParticipants <= 1 || acceptedParticipantCount >= quest.minParticipants;
  const hasContentBlocks = quest.contentBlocks && quest.contentBlocks.length > 0;
  const isCompleteReady = hasContentBlocks
    ? groupRequirementMet
    : (quest.steps && quest.steps.length > 0 && checkedSteps.length === quest.steps.length && groupRequirementMet);

  const currentUserParticipant = groupParticipants.find((participant) => participant.isCurrentUser);
  const visibleParticipants = isActive && currentUserParticipant
    ? groupParticipants.map((participant) => (
      participant.isCurrentUser
        ? { ...participant, completedStepIndexes: checkedSteps }
        : participant
    ))
    : groupParticipants;

  const handleToggleStep = (index: number) => {
    const currentSteps = activeQuests[quest.id] || [];
    const nextSteps = currentSteps.includes(index)
      ? currentSteps.filter((stepIndex) => stepIndex !== index)
      : [...currentSteps, index];

    toggleQuestStep(quest.id, index);
    syncStepProgress.mutate({ questId: quest.id, completedStepIndexes: nextSteps });
  };

  const handleQuitQuest = () => {
    const quit = () => quitQuest.mutate(quest.id);

    if (Platform.OS === "web") {
      if ((globalThis as any).confirm?.("Quit this quest and clear its step progress?") !== false) {
        quit();
      }
      return;
    }

    Alert.alert(
      "Quit quest?",
      "This will remove the quest from your in-progress list and clear your step progress.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Quit",
          style: "destructive",
          onPress: quit
        }
      ]
    );
  };

  const handleToggleQuestGroupMember = (userId: string) => {
    setNewQuestGroupMemberIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleAddQuestToGroup = (groupId: string) => {
    addFriendGroupQuest.mutate(
      { groupId, questId: quest.id },
      {
        onSuccess: () => {
          setIsAddToGroupOpen(false);
          notify("Quest added to group.");
        },
        onError: (error) => {
          console.error("Could not add quest to group", error);
          notify(error instanceof Error ? error.message : "Could not add quest to group.");
        }
      }
    );
  };

  const handleCreateGroupForQuest = () => {
    createFriendGroup.mutate(
      {
        name: newQuestGroupName.trim() || `${quest.title} group`,
        memberIds: Array.from(newQuestGroupMemberIds)
      },
      {
        onSuccess: (groupId) => {
          if (!groupId) return;
          addFriendGroupQuest.mutate(
            { groupId, questId: quest.id },
            {
              onSuccess: () => {
                setNewQuestGroupName("");
                setNewQuestGroupMemberIds(new Set());
                setIsAddToGroupOpen(false);
                notify("Group created and quest added.");
              },
              onError: (error) => {
                console.error("Could not add quest to newly created group", error);
                notify(error instanceof Error ? error.message : "Group was created, but the quest could not be added.");
              }
            }
          );
        },
        onError: (error) => {
          console.error("Could not create group for quest", error);
          notify(error instanceof Error ? error.message : "Could not create group.");
        }
      }
    );
  };
    
  return (
    <Screen scroll={false} contentClassName="px-0 relative">
      <QuestExecutionProvider>
        
        {/* ABSOLUTE FLOATING TOP NAV */}
        <View 
          className="absolute top-0 left-0 right-0 z-50 flex-row justify-between items-center px-5" 
          style={{ paddingTop: Math.max(insets.top, 20) }}
          pointerEvents="box-none"
        >
          <Pressable 
            onPress={() => router.back()} 
            className="h-10 w-10 items-center justify-center rounded-full bg-[#1c1a17]/30 backdrop-blur-md border border-white/20"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </Pressable>

          <Pressable 
            onPress={() => {}} 
            className="h-10 w-10 items-center justify-center rounded-full bg-[#1c1a17]/30 backdrop-blur-md border border-white/20"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </Pressable>
        </View>

        {/* SCROLL VIEW 
          Index 0: Hero & Gallery 
          Index 1: Sticky Progress Bar
          Index 2: Steps & Buttons
        */}
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false} 
          contentContainerClassName="pb-36"
        >
          
          {/* [INDEX 0]: HERO & GALLERY */}
          <View>
            <QuestHero 
              quest={quest} 
              isSaved={isSaved} 
              onSavePress={() => saveQuest.mutate(quest.id)} 
            />

            <View className="px-5">
              {quest.galleryUrls && quest.galleryUrls.filter(Boolean).length > 0 && (
                <View className="mt-4 flex-row gap-2">
                  {quest.galleryUrls.filter(Boolean).map((url, i) => (
                    <Image key={i} source={{ uri: url }} className="flex-1 aspect-square rounded-2xl bg-surface border border-line/50" contentFit="cover" />
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* [INDEX 1]: PROGRESS BAR */}
          {isActive ? (
            <View className="bg-background z-40">
              <View className="border-b border-line/50 bg-background px-5 py-4 shadow-sm">
                <Pressable onPress={() => setIsProgressExpanded((value) => !value)} className="flex-row items-center justify-between">
                  <View>
                    <AppText className="text-[10px] font-sansSemi text-ink dark:text-ivory uppercase tracking-widest">Quest Progress</AppText>
                    {isGroupQuest ? (
                      <AppText variant="caption" className="mt-1 text-ink/55 dark:text-ivory/55">
                        {acceptedParticipantCount} joined{groupProgress.data?.pendingCount ? ` · ${groupProgress.data.pendingCount} pending` : ""}
                      </AppText>
                    ) : null}
                  </View>
                  <View className="flex-row items-center">
                    <AppText className="mr-2 text-[10px] font-sansSemi text-ink/60 dark:text-ivory/60 uppercase tracking-widest">
                      {checkedSteps.length} of {quest.steps.length}
                    </AppText>
                    <AppText className="text-base text-ink/60 dark:text-ivory/60">{isProgressExpanded ? "^" : "v"}</AppText>
                  </View>
                </Pressable>

                <View className="mt-3">
                  <SegmentedProgressBar completed={checkedSteps.length} total={quest.steps.length} />
                </View>

                {isProgressExpanded && isGroupQuest ? (
                  <View className="mt-4 gap-3">
                    {!groupRequirementMet ? (
                      <View className="rounded-2xl border border-orange/30 bg-orange/10 p-3">
                        <AppText variant="caption" className="font-sansSemi text-orange">
                          Waiting for {quest.minParticipants - acceptedParticipantCount} more friend{quest.minParticipants - acceptedParticipantCount === 1 ? "" : "s"} before this group-only quest can be completed.
                        </AppText>
                      </View>
                    ) : null}

                    {visibleParticipants.length > 0 ? (
                      visibleParticipants.map((participant) => {
                        const completedSteps = participant.completedStepIndexes.filter((stepIndex) => stepIndex < quest.steps.length).length;
                        return (
                          <View key={participant.userId} className="flex-row items-center">
                            <Avatar participant={participant} />
                            <View className="ml-3 flex-1">
                              <View className="mb-2 flex-row items-center justify-between">
                                <AppText className="font-sansSemi text-[13px] text-ink dark:text-ivory" numberOfLines={1}>
                                  {participant.isCurrentUser ? "You" : participant.fullName}
                                </AppText>
                                <AppText variant="caption" className="text-ink/50 dark:text-ivory/50">
                                  {completedSteps}/{quest.steps.length}
                                </AppText>
                              </View>
                              <SegmentedProgressBar completed={completedSteps} total={quest.steps.length} />
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <AppText variant="caption" className="text-ink/60 dark:text-ivory/60">
                        Invite friends to turn this into a shared quest.
                      </AppText>
                    )}
                  </View>
                ) : null}

                {isProgressExpanded && !isGroupQuest ? (
                  <View className="mt-2">
                    <AppText className="text-[10px] font-sansSemi text-ink/60 dark:text-ivory/60 uppercase tracking-widest">
                      {checkedSteps.length} of {quest.steps.length} Completed
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}
          {/* [INDEX 2]: DETAILS & BOTTOM BUTTONS */}
          <View
            className="px-5"
            onLayout={(event) => {
              detailsSectionYRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View
              className="mt-5"
              onLayout={(event) => {
                detailBlockYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <QuestDetailBlock
                quest={quest}
                checkedSteps={checkedSteps}
                onToggleStep={handleToggleStep}
                isActive={isActive}
                expandedStepIndex={expandedStepIndex}
                onExpandedStepChange={setExpandedStepIndex}
                onStepsListLayout={(y) => {
                  stepsListYRef.current = y;
                }}
                onStepLayout={(index, y) => {
                  stepYRefs.current[index] = y;
                  if (currentActiveStepIndex === index && expandedStepIndex === index) {
                    setTimeout(() => scrollToStep(index), 80);
                  }
                }}
              />
            </View>

            <View className="mt-6 flex-row gap-3">
              {!isActive ? (
                quest.minParticipants > 1 ? (
                  <Button label="Start with Group" onPress={() => router.push({ pathname: "/(app)/group/select", params: { questId: quest.id } })} className="flex-1 bg-orange" />
                ) : (
                  <>
                    <Button label={activateQuest.isPending ? "Starting..." : "Start quest"} onPress={() => activateQuest.mutate(quest.id)} className="flex-1" />
                    <Pressable onPress={() => setIsAddToGroupOpen(true)} className="h-[56px] w-[56px] items-center justify-center rounded-[20px] border border-line bg-surface">
                      <Ionicons name="people" size={24} color="var(--color-text)" />
                    </Pressable>
                  </>
                )
              ) : (
                <>
                  <Pressable
                    onPress={handleQuitQuest}
                    disabled={quitQuest.isPending}
                    className={`h-[56px] w-[56px] items-center justify-center rounded-[20px] border border-line bg-surface ${quitQuest.isPending ? "opacity-50" : ""}`}
                  >
                    <AppText className="text-2xl font-sansBold text-[#E63946]">X</AppText>
                  </Pressable>
                  {isCompleteReady ? (
                    <Button label="Complete Quest" className="flex-1 bg-orange" onPress={() => router.push({ pathname: "/complete/[questId]", params: { questId: quest.id } })} />
                  ) : !groupRequirementMet ? (
                    <Button label={`${acceptedParticipantCount}/${quest.minParticipants} Joined`} variant="secondary" className="flex-1" disabled />
                  ) : (
                    <Button label={`${checkedSteps.filter(index => index < quest.steps.length).length}/${quest.steps.length} Steps`} variant="secondary" className="flex-1" disabled />
                  )}
                  {quest.minParticipants <= 1 ? (
                    <Pressable onPress={() => setIsAddToGroupOpen(true)} className="h-[56px] w-[56px] items-center justify-center rounded-[20px] border border-line bg-surface">
                      <Ionicons name="people" size={24} color="var(--color-text)" />
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>

            <Modal
              visible={quest.minParticipants <= 1 && isAddToGroupOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsAddToGroupOpen(false)}
            >
              <View className="flex-1 justify-end bg-black/40 px-5 pb-5">
                <View className="rounded-[28px] border border-line bg-surface p-5">
                  <View className="mb-4 flex-row items-center justify-between">
                    <AppText variant="subtitle">Add to group</AppText>
                    <Pressable onPress={() => setIsAddToGroupOpen(false)} className="h-9 w-9 items-center justify-center rounded-full border border-line bg-background">
                      <Ionicons name="close" size={18} color="var(--color-text)" />
                    </Pressable>
                  </View>

                  {friendGroups.length > 0 ? (
                    <View className="mb-5 gap-2">
                      {friendGroups.map((group) => {
                        const hasQuest = group.quests.some((groupQuest) => groupQuest.id === quest.id);
                        return (
                          <Pressable
                            key={group.id}
                            onPress={() => !hasQuest && handleAddQuestToGroup(group.id)}
                            disabled={hasQuest || addFriendGroupQuest.isPending}
                            className={`rounded-[16px] border px-4 py-3 ${hasQuest ? "border-line bg-line/30" : "border-line bg-background"}`}
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-1 pr-3">
                                <AppText className="font-sansSemi text-[14px] text-ink" numberOfLines={1}>{group.name}</AppText>
                                <AppText variant="caption" className="text-ink/50">
                                  {group.members.length} member{group.members.length === 1 ? "" : "s"} · {group.quests.length} quest{group.quests.length === 1 ? "" : "s"}
                                </AppText>
                              </View>
                              <AppText className="text-[12px] text-ink/50">{hasQuest ? "Added" : "Add"}</AppText>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <TextInput
                    value={newQuestGroupName}
                    onChangeText={setNewQuestGroupName}
                    placeholder="Optional group name"
                    placeholderTextColor="#787267"
                    className="rounded-2xl border border-line bg-background px-4 py-3 font-sans text-[15px] text-ink"
                  />

                  <View className="mt-4 gap-2">
                    {friends.length > 0 ? (
                      friends.map((friend) => {
                        const isSelected = newQuestGroupMemberIds.has(friend.id);
                        return (
                          <Pressable
                            key={friend.id}
                            onPress={() => handleToggleQuestGroupMember(friend.id)}
                            className={`rounded-[16px] border px-4 py-3 ${isSelected ? "border-ink bg-ink" : "border-line bg-background"}`}
                          >
                            <View className="flex-row items-center justify-between">
                              <AppText className={`font-sansSemi text-[14px] ${isSelected ? "text-ivory" : "text-ink"}`}>
                                {friend.fullName}
                              </AppText>
                              {isSelected ? <Ionicons name="checkmark" size={18} color="#F7F1E6" /> : null}
                            </View>
                          </Pressable>
                        );
                      })
                    ) : (
                      <AppText className="text-ink/55">Add friends first, then gather them into a group.</AppText>
                    )}
                  </View>

                  <Button
                    label={createFriendGroup.isPending || addFriendGroupQuest.isPending ? "Adding..." : "Create group"}
                    className="mt-5"
                    onPress={handleCreateGroupForQuest}
                    disabled={newQuestGroupMemberIds.size === 0 || createFriendGroup.isPending || addFriendGroupQuest.isPending}
                  />
                </View>
              </View>
            </Modal>
          </View>

        </ScrollView>
      </QuestExecutionProvider>
    </Screen>
  );
}
