import { View, Pressable, Modal, Alert, Platform, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { useLoreEntry, useDeleteLoreEntry } from "../../../src/features/lore/api/loreApi";
import { LoreCard } from "../../../src/features/lore/components/LoreCard";
import { AutoCompletedQuestGrid } from "../../../src/features/lore/components/AutoCompletedQuestGrid";
import { useAuth } from "../../../src/features/auth/AuthProvider";
import * as MediaLibrary from "expo-media-library/legacy";
import { useThemeColors } from "../../../src/shared/design/useThemeColors";
import { useAddLoreComment, useLoreComments, useLoreLikeState, useToggleLoreLike } from "../../../src/features/social/api/socialApi";

export default function LoreDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry } = useLoreEntry(id);
  const { profile, user } = useAuth();
  const deleteMutation = useDeleteLoreEntry();
  const commentsQuery = useLoreComments(id);
  const likeQuery = useLoreLikeState(id);
  const toggleLike = useToggleLoreLike();
  const addComment = useAddLoreComment();

  const [isModalVisible, setModalVisible] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const viewRef = useRef(null);

  const handleShare = async () => {
    try {
      const uri = await captureRef(viewRef, {
        format: "png",
        quality: 1,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Sharing is not available on this device.");
      }
    } catch (error) {
      Alert.alert("Failed to share the lore entry.");
    }
  };
  const handleDownload = async () => {
    try {
      // captureRef returns a base64 URI on the web, and a local file URI on native
      const uri = await captureRef(viewRef, { format: "png", quality: 1 });

      if (Platform.OS === 'web') {
        // Standard browser download for Web
        const link = document.createElement('a');
        link.href = uri;
        link.download = `lore-card-${entry!.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Using standard alert on web as Alert.alert behavior can be inconsistent
        alert("Lore card downloaded to your computer!"); 
        return;
      }

      // Native Mobile Approach (iOS/Android)
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed to save photos.');
        return;
      }
      
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Saved!", "Lore card saved to your gallery.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save the image.");
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("Delete Lore Entry?\n\nThis will permanently delete this entry and allow you to retake the quest.")) {
        deleteMutation.mutateAsync({ entryId: entry!.id, questId: entry!.questId ?? null }).then(() => {
          router.back();
        });
      }
      return;
    }

    Alert.alert(
      "Delete Lore Entry?",
      "This will permanently delete this entry and allow you to retake the quest.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await deleteMutation.mutateAsync({ entryId: entry!.id, questId: entry!.questId ?? null });
            router.back();
          } 
        }
      ]
    );
  };

  const handleAddComment = async () => {
    if (!entry || !commentBody.trim()) return;

    await addComment.mutateAsync({ entryId: entry.id, body: commentBody });
    setCommentBody("");
  };

  const handleToggleLike = () => {
    if (!entry || toggleLike.isPending) return;
    toggleLike.mutate({
      entryId: entry.id,
      liked: likeQuery.data?.likedByMe ?? false
    });
  };

  const handlePhotoScroll = (event: any) => {
    const width = event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextIndex = Math.min(
      photos.length - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.x / width))
    );
    setActivePhotoIndex(nextIndex);
  };

  if (!entry) {
    return (
      <Screen>
        <TopBar showBack title="Lore" />
        <AppText variant="title">Entry not found.</AppText>
      </Screen>
    );
  }

  const isOwnEntry = entry.userId === user?.id;
  const uploader = entry.uploader ?? (
    isOwnEntry && profile ? {
      id: profile.id,
      name: profile.fullName,
      handle: profile.handle,
      avatarUrl: profile.avatarUrl
    } : {
      id: entry.userId,
      name: "Explorer",
      handle: undefined,
      avatarUrl: null
    }
  );
  const photos = entry.photos.length > 0 ? entry.photos : [{ id: `${entry.id}-cover`, uri: entry.imageUrl }];
  const likeCount = likeQuery.data?.likeCount ?? 0;
  const likedByMe = likeQuery.data?.likedByMe ?? false;
  const autoCompletedQuests = entry.autoCompletedQuests ?? [];
  const canViewUploaderProfile = !!uploader.id;
  const openUploaderProfile = () => {
    if (!uploader.id) return;
    router.push(isOwnEntry ? "/profile" : `/friend/${uploader.id}`);
  };

  return (
    <Screen contentClassName="px-0 pb-36">
      <TopBar showBack title="Lore Entry" />
      <View className="px-5">
        <View
          className="overflow-hidden rounded-card bg-charcoal"
          onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}
        >
          <View className="h-[500px]">
            {carouselWidth > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handlePhotoScroll}
                onMomentumScrollEnd={handlePhotoScroll}
                scrollEventThrottle={16}
              >
                {photos.map((photo, index) => (
                  <View key={photo.id} className="relative h-full" style={{ width: carouselWidth }}>
                    <Image
                      source={{ uri: photo.uri }}
                      contentFit="cover"
                      transition={360}
                      style={{ height: "100%", width: "100%", opacity: 0.92 }}
                    />

                    {index === 0 ? (
                      <>
                        <View className="absolute inset-0 bg-charcoal/20" pointerEvents="none" />

                        <Pressable
                          disabled={!canViewUploaderProfile}
                          onPress={openUploaderProfile}
                          className="absolute left-4 top-4 flex-row items-center rounded-full bg-black/45 py-2 pl-2 pr-4"
                        >
                          <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-orange">
                            {uploader.avatarUrl ? (
                              <Image source={{ uri: uploader.avatarUrl }} className="h-full w-full" contentFit="cover" />
                            ) : (
                              <AppText className="font-sansSemi text-sm text-ivory">
                                {uploader.name.charAt(0).toUpperCase()}
                              </AppText>
                            )}
                          </View>
                          <View className="ml-3 max-w-[210px]">
                            <AppText numberOfLines={1} className="font-sansSemi text-sm text-white">{uploader.name}</AppText>
                            {uploader.handle ? (
                              <AppText numberOfLines={1} variant="caption" className="text-white/75">@{uploader.handle}</AppText>
                            ) : null}
                          </View>
                        </Pressable>

                        <View className="absolute bottom-5 left-5 right-24">
                          <AppText variant="eyebrow" className="mb-3 text-ivory/80">{entry.questTitle}</AppText>
                          <AppText variant="display" className="text-ivory">{entry.title}</AppText>
                          <AppText variant="caption" className="mt-3 text-ivory/80">{entry.date} · {entry.location}</AppText>
                        </View>

                        <View className="absolute bottom-5 right-5 items-center">
                          <AppText className="mb-1 font-sansSemi text-xs text-white">{likeCount}</AppText>
                          <TouchableOpacity
                            accessibilityLabel="Like"
                            accessibilityRole="button"
                            onPress={handleToggleLike}
                            activeOpacity={0.75}
                            className="h-12 w-12 items-center justify-center rounded-full bg-black/45"
                          >
                            <Ionicons name={likedByMe ? "heart" : "heart-outline"} size={24} color="white" />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>

        {photos.length > 1 ? (
          <View className="mt-4 flex-row items-center justify-center gap-2">
            {photos.map((photo, index) => (
              <View
                key={photo.id}
                className={index === activePhotoIndex ? "h-2 w-5 rounded-full bg-ink" : "h-2 w-2 rounded-full bg-line"}
              />
            ))}
          </View>
        ) : null}

        <View className="mt-7">
          <AppText variant="eyebrow">Caption</AppText>
          <AppText className="mt-3 text-muted">{entry.journal}</AppText>
        </View>

        <View className="mt-7 border-t border-line pt-6">
          <AppText variant="eyebrow">Comments</AppText>
          <View className="mt-4 gap-4">
            {(commentsQuery.data ?? []).length > 0 ? (
              commentsQuery.data?.map((comment) => (
                <View key={comment.id} className="border-b border-line/50 pb-4">
                  <View className="flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-orange">
                      {comment.author.avatarUrl ? (
                        <Image source={{ uri: comment.author.avatarUrl }} className="h-full w-full" contentFit="cover" />
                      ) : (
                        <AppText className="font-sansSemi text-xs text-ivory">
                          {comment.author.name.charAt(0).toUpperCase()}
                        </AppText>
                      )}
                    </View>
                    <View className="flex-1">
                      <AppText className="font-sansSemi text-sm text-ink">{comment.author.name}</AppText>
                      <AppText variant="caption" className="text-tertiary">@{comment.author.handle}</AppText>
                    </View>
                  </View>
                  <AppText className="mt-2 text-muted">{comment.body}</AppText>
                </View>
              ))
            ) : (
              <AppText className="text-muted">No comments yet.</AppText>
            )}
          </View>
          <View className="mt-5 flex-row items-center gap-3">
            <TextInput
              className="flex-1 rounded-2xl border border-line bg-background px-4 py-3 font-sans text-sm text-ink"
              placeholder="Add a comment"
              placeholderTextColor={colors.textTertiary}
              value={commentBody}
              onChangeText={setCommentBody}
            />
            <Pressable
              onPress={handleAddComment}
              disabled={!commentBody.trim() || addComment.isPending}
              className="h-12 w-12 items-center justify-center rounded-full bg-accent disabled:opacity-50"
            >
              <Ionicons name="send" size={18} color={colors.accentText} />
            </Pressable>
          </View>
        </View>

        {isOwnEntry ? (
          <View className="mt-8">
            <Pressable onPress={handleDelete} className="py-4 items-center border border-red-500/30 rounded-2xl bg-red-500/5">
              <AppText className="text-red-500 font-sansSemi">Delete Lore Entry</AppText>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-4">
          <Pressable onPress={() => setModalVisible(true)} className="h-12 flex-row items-center justify-center rounded-2xl border border-line bg-surface">
            <Ionicons name="expand-outline" size={20} color={colors.text} />
            <AppText className="ml-2 font-sansSemi text-sm text-ink">Open lore card</AppText>
          </Pressable>
        </View>

        <View className="mt-4 mb-6">
          <Button
            label="View Quest"
            variant="secondary"
            onPress={() => {
              if (entry.questId) {
                router.push({ pathname: "/quest/[id]", params: { id: entry.questId } });
              }
            }}
          />
        </View>

        {autoCompletedQuests.length > 0 ? (
          <View className="mt-7 border-t border-line pt-6">
            <AppText variant="eyebrow">Completing this quest also completed:</AppText>
            <View className="mt-4">
              <AutoCompletedQuestGrid
                quests={autoCompletedQuests}
                onQuestPress={(quest) => router.push({ pathname: "/quest/[id]", params: { id: quest.id } })}
              />
            </View>
          </View>
        ) : null}
      </View>


      

      {/* Lore Card Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/90 relative">
          {/* Fixed Close Button */}
          <Pressable 
            onPress={() => setModalVisible(false)} 
            className="absolute top-12 right-6 h-12 w-12 items-center justify-center rounded-full bg-white/10 z-50"
          >
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
          
          {/* Scrollable Content */}
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingVertical: 100 }}
          >
            <View ref={viewRef} className="w-full rounded-2xl overflow-hidden" collapsable={false}>
              <LoreCard 
                heroImageUri={entry.imageUrl}
                title={entry.questTitle || entry.title}
                caption={entry.excerpt}
                locationName={entry.location}
                coordinates={entry.latitude && entry.longitude ? `${entry.latitude.toFixed(4)}, ${entry.longitude.toFixed(4)}` : undefined}
                extraQuestCount={autoCompletedQuests.length}
              />
            </View>

            {autoCompletedQuests.length > 0 ? (
              <View className="mt-6 w-full">
                <AppText className="mb-3 text-center font-sansSemi text-sm uppercase tracking-widest text-white/70">
                  Also completed
                </AppText>
                <AutoCompletedQuestGrid quests={autoCompletedQuests} />
              </View>
            ) : null}

            <View className="mt-8 flex-row gap-6">
              <Pressable onPress={handleDownload} className="h-16 w-16 bg-accent rounded-full items-center justify-center">
                <Ionicons name="download-outline" size={28} color={colors.accentText} />
              </Pressable>
              <Pressable onPress={handleShare} className="h-16 w-16 bg-accent rounded-full items-center justify-center">
                <Ionicons name="share-outline" size={28} color={colors.accentText} />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
