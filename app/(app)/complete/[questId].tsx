import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, View, ScrollView, TextInput, TouchableOpacity, Image, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { ArrowLeft, ArrowRight, Camera, MapPin, Search, Share2, Users, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useCreateLoreEntry } from '../../../src/features/lore/api/loreApi';
import { searchLocations, type LocationSearchResult } from '../../../src/features/location/api/locationSearchApi';
import { useFriendsList } from '../../../src/features/social/api/socialApi';
import { Screen } from '../../../src/shared/components/Screen';
import { AppText } from '../../../src/shared/components/AppText';
import { LoreCard } from '../../../src/features/lore/components/LoreCard';
import { supabase } from '../../../src/lib/supabase'; 
import type { LoreEntry, Profile, Quest } from '../../../src/shared/types/domain';
import { getJourneyQuestIds, useJourneys, useQuest, useQuests, useUserQuestStatuses } from '../../../src/features/quests/api/questApi';
import { useAuth } from '../../../src/features/auth/AuthProvider';
import { getExperienceProgress } from '../../../src/features/points/components/ExperienceProgressCard';

const MAX_PHOTOS = 3;
const MAX_UPLOAD_IMAGE_EDGE = 1800;
const UPLOAD_IMAGE_QUALITY = 0.78;

type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

type CompletionStage = "form" | "quest" | "streak" | "unlocked";

async function fetchAutoCompleteQuestIds(questId: string, fallbackQuestIds: string[] = []) {
  if (!supabase) return fallbackQuestIds;

  const { data, error } = await supabase
    .from('quests')
    .select('auto_complete_quest_ids')
    .eq('id', questId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch linked auto-complete quests:", error);
    return fallbackQuestIds;
  }

  return (data?.auto_complete_quest_ids as string[] | null) ?? fallbackQuestIds;
}

async function compressSelectedPhoto(photo: SelectedPhoto): Promise<SelectedPhoto> {
  const width = photo.width ?? undefined;
  const height = photo.height ?? undefined;
  const longEdge = width && height ? Math.max(width, height) : null;
  const resizeAction = longEdge && longEdge > MAX_UPLOAD_IMAGE_EDGE
    ? [{
        resize: width && height && width >= height
          ? { width: MAX_UPLOAD_IMAGE_EDGE }
          : { height: MAX_UPLOAD_IMAGE_EDGE }
      }]
    : [];

  const result = await ImageManipulator.manipulateAsync(
    photo.uri,
    resizeAction,
    {
      compress: UPLOAD_IMAGE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    mimeType: 'image/jpeg'
  };
}

export default function QuestCompletionScreen() {
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const { questId } = useLocalSearchParams();
  const router = useRouter();
  const viewShotRef = useRef<any>(null);
  const completionScrollRef = useRef<ScrollView | null>(null);
  const scrollContentRef = useRef<View | null>(null);
  const locationFieldRef = useRef<View | null>(null);
  const locationSearchRequestId = useRef(0);
  const { data: quest } = useQuest(questId as string);
  const { data: quests = [] } = useQuests();
  const { data: journeys = [] } = useJourneys();
  const { data: questStatuses } = useUserQuestStatuses();
  const { data: friends = [], isLoading: isLoadingFriends } = useFriendsList();
  const createLoreEntry = useCreateLoreEntry();
  const [completionStage, setCompletionStage] = useState<CompletionStage>("form");
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [locationResults, setLocationResults] = useState<LocationSearchResult[]>([]);
  const [isLocationSearchOpen, setIsLocationSearchOpen] = useState(false);
  const [isLocationSearching, setIsLocationSearching] = useState(false);
  const [photoFrameWidth, setPhotoFrameWidth] = useState(0);
  const [selectedFriends, setSelectedFriends] = useState<Profile[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [isPeoplePickerOpen, setIsPeoplePickerOpen] = useState(false);
  const [isCompressingPhotos, setIsCompressingPhotos] = useState(false);
  const [savedEntry, setSavedEntry] = useState<LoreEntry | null>(null);

  
  const [questTitle, setQuestTitle] = useState<string>("Loading...");
  const previewWidth = Math.max(photoFrameWidth, 1);
  const heroPhotoIndex = activePhotoIndex < selectedPhotos.length ? activePhotoIndex : 0;
  const heroImage = selectedPhotos[heroPhotoIndex]?.uri ?? null;
  const slideCount = selectedPhotos.length < MAX_PHOTOS ? selectedPhotos.length + 1 : selectedPhotos.length;
  const remainingPhotoSlots = MAX_PHOTOS - selectedPhotos.length;
  const filteredFriends = friends.filter((friend) => {
    const query = friendSearch.trim().toLowerCase();
    if (!query) return true;
    return `${friend.fullName} ${friend.handle}`.toLowerCase().includes(query);
  });
  const completedQuestIds = useMemo(() => new Set(questStatuses?.completed ?? []), [questStatuses?.completed]);
  const screenMaxWidth = Math.min(width, 430);
  const completionPoints = savedEntry?.pointsAwarded ?? (quest ? quest.pointsValue + Math.min(3, selectedPhotos.length) * 2 : 0);
  const nextPointsTotal = (profile?.pointsTotal ?? 0) + completionPoints;
  const { level, progress } = getExperienceProgress(nextPointsTotal);
  const streakCount = savedEntry?.completionStreak ?? profile?.currentStreak ?? 0;
  const coverImageUri = savedEntry?.imageUrl ?? heroImage ?? quest?.imageUrl ?? "";
  const unlockedQuests = useMemo(() => {
    if (!quest) return [];

    const directUnlockIds = new Set([
      ...(quest.unlockQuestIds ?? []),
      ...quests
        .filter((item) => (item.unlockedByQuestIds ?? []).includes(quest.id))
        .map((item) => item.id)
    ]);

    const journeyNextQuestIds = new Set<string>();
    journeys.forEach((journey) => {
      const journeyQuestIds = getJourneyQuestIds(journey);
      const currentIndex = journeyQuestIds.indexOf(quest.id);
      if (currentIndex >= 0 && journeyQuestIds[currentIndex + 1]) {
        journeyNextQuestIds.add(journeyQuestIds[currentIndex + 1]);
      }
    });

    return Array.from(directUnlockIds)
      .filter((id) => id !== quest.id && !journeyNextQuestIds.has(id) && !completedQuestIds.has(id))
      .map((id) => quests.find((item) => item.id === id))
      .filter(Boolean) as Quest[];
  }, [completedQuestIds, journeys, quest, quests]);
  //const [coordinates, setCoordinates] = useState<string>("");

  const scrollLocationIntoView = useCallback(() => {
    const scrollView = completionScrollRef.current;
    const scrollContent = scrollContentRef.current;
    const locationField = locationFieldRef.current;

    if (!scrollView || !scrollContent || !locationField) {
      return;
    }

    const delay = Platform.OS === 'android' ? 300 : 80;

    setTimeout(() => {
      locationField.measureLayout(
        scrollContent,
        (_x, y) => {
          scrollView.scrollTo({
            y: Math.max(y - 120, 0),
            animated: true
          });
        },
        () => {
          scrollView.scrollToEnd({ animated: true });
        }
      );
    }, delay);
  }, []);

  useEffect(() => {
    const fetchQuestDetails = async () => {
      if (!supabase) {
  return;
}

      const { data, error } = await supabase
        .from('quests')
        .select('title')
        .eq('id', questId)
        .single();

      if (error) {
        console.error("Error fetching quest details:", error);
      } else {
        setQuestTitle(data.title);

      }
    };

    fetchQuestDetails();
  }, [questId]);

  useEffect(() => {
    const requestId = ++locationSearchRequestId.current;
    const trimmedLocation = location.trim();

    if (trimmedLocation.length < 3 || selectedLocation?.name === trimmedLocation) {
      setLocationResults([]);
      setIsLocationSearchOpen(false);
      setIsLocationSearching(false);
      return;
    }

    setIsLocationSearching(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const results = await searchLocations(trimmedLocation, 5);

        if (requestId !== locationSearchRequestId.current) {
          return;
        }

        setLocationResults(results);
        setIsLocationSearchOpen(results.length > 0);
      } catch (error) {
        if (requestId === locationSearchRequestId.current) {
          setLocationResults([]);
          setIsLocationSearchOpen(false);
        }

        console.error('Failed to search locations:', error);
      } finally {
        if (requestId === locationSearchRequestId.current) {
          setIsLocationSearching(false);
        }
      }
    }, 600);

    return () => clearTimeout(debounceTimer);
  }, [location, selectedLocation?.name]);

  useEffect(() => {
    if (isLocationSearchOpen || isLocationSearching) {
      scrollLocationIntoView();
    }
  }, [isLocationSearchOpen, isLocationSearching, scrollLocationIntoView]);

  const pickPhotos = async () => {
    if (remainingPhotoSlots <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: remainingPhotoSlots > 1,
      selectionLimit: remainingPhotoSlots,
      orderedSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const insertIndex = selectedPhotos.length;
      setIsCompressingPhotos(true);

      try {
        const pickedPhotos = result.assets.slice(0, remainingPhotoSlots).map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType
        }));
        const nextPhotos = await Promise.all(pickedPhotos.map(compressSelectedPhoto));

        setSelectedPhotos((prev) => [...prev, ...nextPhotos].slice(0, MAX_PHOTOS));
        setActivePhotoIndex(Math.min(insertIndex, MAX_PHOTOS - 1));
      } catch (error) {
        console.error('Failed to compress selected photos:', error);
      } finally {
        setIsCompressingPhotos(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => {
      const nextPhotos = prev.filter((_, i) => i !== index);
      const nextSlideCount = nextPhotos.length < MAX_PHOTOS ? nextPhotos.length + 1 : nextPhotos.length;
      setActivePhotoIndex((current) => Math.min(current, Math.max(nextSlideCount - 1, 0)));
      return nextPhotos;
    });
  };

  const handlePhotoScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / previewWidth);
    setActivePhotoIndex(Math.min(Math.max(nextIndex, 0), Math.max(slideCount - 1, 0)));
  };

  const handleLocationChange = (text: string) => {
    setLocation(text);

    if (selectedLocation && selectedLocation.name !== text) {
      setSelectedLocation(null);
    }
  };

  const selectLocation = (result: LocationSearchResult) => {
    setSelectedLocation(result);
    setLocation(result.name);
    setLocationResults([]);
    setIsLocationSearchOpen(false);
  };

  const toggleSelectedFriend = (friend: Profile) => {
    setSelectedFriends((prev) => {
      const isSelected = prev.some((selectedFriend) => selectedFriend.id === friend.id);
      return isSelected
        ? prev.filter((selectedFriend) => selectedFriend.id !== friend.id)
        : [...prev, friend];
    });
  };


  const handleSaveAndComplete = async () => {
    if (!quest || !heroImage) return;

    try {
      // Package up the images
      const people = selectedFriends.map((friend) => friend.fullName || friend.handle);
      const orderedPhotos = selectedPhotos.length > 0
        ? [selectedPhotos[heroPhotoIndex], ...selectedPhotos.filter((_, index) => index !== heroPhotoIndex)]
        : [];
      const photoAssets = orderedPhotos.map((photo) => ({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        mimeType: photo.mimeType ?? 'image/jpeg'
      }));

      // Save to Supabase (this handles the completed status and points)
      const questById = new Map(quests.map((item) => [item.id, item]));
      const linkedQuestIds = await fetchAutoCompleteQuestIds(quest.id, quest.autoCompleteQuestIds ?? []);
      const autoCompletedQuests = linkedQuestIds
        .filter((linkedQuestId) => linkedQuestId !== quest.id && !completedQuestIds.has(linkedQuestId))
        .map((linkedQuestId) => questById.get(linkedQuestId))
        .filter(Boolean) as Quest[];

      const savedEntry = await createLoreEntry.mutateAsync({
        quest: { ...quest, autoCompleteQuestIds: linkedQuestIds },
        autoCompletedQuests,
        title: quest.title,
        journal: caption || "No words needed.",
        location: location || "Unknown Location",
        latitude: selectedLocation?.latitude ?? null,
        longitude: selectedLocation?.longitude ?? null,
        mood: quest.mood,
        people,
        tags: [],
        photoAssets
      });
      setSavedEntry(savedEntry);
      setCompletionStage("quest");
      
      // Navigate straight to the user's My Lore tab
      
    } catch (err) {
      console.error("Failed to save lore:", err);
      const message = err instanceof Error ? err.message : "Please try again.";

      if (Platform.OS === "web") {
        (globalThis as any).alert?.(`Could not save your lore photos. ${message}`);
      } else {
        Alert.alert("Could not save your photos", message);
      }
    }
  };
  const handleShare = async () => {
    if (viewShotRef.current?.capture) {
      try {
        const uri = await viewShotRef.current.capture();
        
        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = uri;
          link.download = 'my-lore-card.jpg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'image/jpeg',
              dialogTitle: 'Share your Lore',
              UTI: 'public.jpeg'
            });
          }
        }
        
        router.push('/(app)/(tabs)/archive');
        
      } catch (err) {
        console.error("Failed to share", err);
      }
    }
  };
  if (completionStage === "quest") {
    return (
      <CompletionShell>
        {coverImageUri ? (
          <Image source={{ uri: coverImageUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        ) : null}
        <LinearGradient
          colors={["rgba(13, 13, 12, 0.72)", "rgba(24, 24, 23, 0.82)", "rgba(10, 10, 10, 0.98)"]}
          locations={[0, 0.48, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.questCompleteContent}>
          <TouchableOpacity accessibilityLabel="Share quest completion" onPress={handleShare} style={styles.shareButton}>
            <Share2 color="#F5F0E7" size={19} strokeWidth={1.9} />
          </TouchableOpacity>

          <View style={styles.questCompleteTitleBlock}>
            <AppText style={styles.questCompleteTitle}>Quest</AppText>
            <AppText style={styles.questCompleteTitle}>Completed</AppText>
            <View style={styles.goldRule} />
          </View>

          <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }} style={styles.completedCardShot}>
            <QuestCompletionCard
              imageUri={coverImageUri}
              title={quest?.title ?? questTitle}
              caption={savedEntry?.excerpt ?? (caption || "No words needed.")}
              locationName={savedEntry?.location ?? (location || "UNKNOWN LOCATION")}
              extraQuestCount={savedEntry?.autoCompletedQuests?.length ?? 0}
            />
          </ViewShot>

          <View style={styles.xpRow}>
            <AppText style={styles.xpPlus}>+</AppText>
            <AppText style={styles.xpValue}>{completionPoints}</AppText>
            <AppText style={styles.xpLabel}>xp</AppText>
          </View>

          <View style={styles.levelBlock}>
            <AppText style={styles.levelLabel}>Level {level}</AppText>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${Math.max(0.08, progress) * 100}%` }]} />
            </View>
          </View>
        </View>

        <CompletionButton label="Next" onPress={() => setCompletionStage("streak")} />
      </CompletionShell>
    );
  }

  if (completionStage === "streak") {
    return (
      <CompletionShell>
        <View style={styles.centerStageContent}>
          <AppText style={styles.centerTitle}>Your Streak</AppText>
          <View style={styles.streakCenter}>
            <FlameMark />
            <AppText style={styles.streakNumber}>{streakCount}</AppText>
            <AppText style={styles.streakLabel}>DAY STREAK</AppText>
          </View>
        </View>

        <CompletionButton
          label="Keep It Going"
          onPress={() => {
            if (unlockedQuests.length > 0) {
              setCompletionStage("unlocked");
            } else {
              router.push('/(app)/(tabs)/archive');
            }
          }}
        />
      </CompletionShell>
    );
  }

  if (completionStage === "unlocked") {
    return (
      <CompletionShell>
        <View style={styles.unlockedContent}>
          <AppText style={styles.centerTitle}>You Unlocked</AppText>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.unlockedList}>
            {unlockedQuests.map((unlockedQuest) => (
              <View key={unlockedQuest.id} style={styles.unlockedQuestRow}>
                <Image source={{ uri: unlockedQuest.imageUrl }} resizeMode="cover" style={styles.unlockedQuestImage} />
                <View style={styles.unlockedQuestText}>
                  <AppText numberOfLines={1} style={styles.unlockedQuestTitle}>{unlockedQuest.title}</AppText>
                  <AppText numberOfLines={2} style={styles.unlockedQuestDescription}>{unlockedQuest.description}</AppText>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <CompletionButton label="View My Lore" onPress={() => router.push('/(app)/(tabs)/archive')} />
      </CompletionShell>
    );
  }

  return (
    <Screen scroll={false} className="bg-[#071512]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={completionScrollRef}
          className="flex-1"
          contentContainerStyle={[styles.formScrollContent, { paddingBottom: isPeoplePickerOpen || isLocationSearchOpen ? 220 : 142 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View ref={scrollContentRef} collapsable={false} style={[styles.formContent, { maxWidth: screenMaxWidth }]}>
            <View style={styles.formHeader}>
              <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft color="#C39A66" size={20} strokeWidth={1.7} />
              </TouchableOpacity>
              <AppText style={styles.formEyebrow}>COMPLETE QUEST</AppText>
              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.formTitleRow}>
              <View>
                <AppText style={styles.formTitle}>Add Photos</AppText>
                <AppText style={styles.formSubtitle}>Add up to 3 photos from this quest</AppText>
              </View>
              <AppText style={styles.formCount}>{selectedPhotos.length} / {MAX_PHOTOS}</AppText>
            </View>

            <View
              style={[styles.photoFrame, selectedPhotos.length > 0 ? styles.photoFrameWithPhotos : null]}
              onLayout={(event) => setPhotoFrameWidth(event.nativeEvent.layout.width)}
            >
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handlePhotoScroll}
                scrollEventThrottle={16}
              >
                {photoFrameWidth > 0 && selectedPhotos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} style={[styles.photoSlide, { width: previewWidth }]}>
                    {index === heroPhotoIndex ? (
                      <FormPhotoPreview
                        imageUri={photo.uri}
                        title={questTitle}
                        caption={caption || "No words needed."}
                        locationName={location || "UNKNOWN LOCATION"}
                        extraQuestCount={0}
                      />
                    ) : (
                      <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.photoImage} />
                    )}
                    <TouchableOpacity
                      accessibilityLabel="Remove photo"
                      onPress={() => removePhoto(index)}
                      style={styles.removePhotoButton}
                    >
                      <X color="#F5F0E7" size={15} />
                    </TouchableOpacity>
                  </View>
                ))}

                {photoFrameWidth > 0 && selectedPhotos.length < MAX_PHOTOS && (
                  <TouchableOpacity
                    onPress={pickPhotos}
                    activeOpacity={0.82}
                    style={[styles.photoSlide, styles.addPhotoSlide, { width: previewWidth }]}
                  >
                    <View style={styles.addPhotoIcon}>
                      <Camera color="#C39A66" size={22} strokeWidth={1.7} />
                    </View>
                    <AppText style={styles.addPhotoTitle}>Add Photos</AppText>
                    <AppText style={styles.addPhotoSubtitle}>Tap to select up to 3 photos</AppText>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>

            <View style={styles.photoDots}>
              {Array.from({ length: slideCount }).map((_, index) => (
                <View
                  key={index}
                  style={[styles.photoDot, activePhotoIndex === index ? styles.photoDotActive : styles.photoDotInactive]}
                />
              ))}
            </View>

            <AppText style={styles.inputLabel}>Caption</AppText>
            <View style={styles.captionBox}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write about your quest..."
                placeholderTextColor="#E8DFC9"
                multiline
                textAlignVertical="top"
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
              />
              <AppText style={styles.captionCount}>{caption.length} / 500</AppText>
            </View>

            <View ref={locationFieldRef} collapsable={false} style={styles.metaRow}>
              <View style={styles.locationField}>
                <MapPin color="#C39A66" size={18} strokeWidth={1.9} />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Add location"
                  placeholderTextColor="#E8DFC9"
                  value={location}
                  onChangeText={handleLocationChange}
                  onFocus={() => {
                    setIsLocationSearchOpen(locationResults.length > 0);
                    scrollLocationIntoView();
                  }}
                />
                {isLocationSearching ? (
                  <ActivityIndicator size="small" color="#C39A66" />
                ) : (
                  <Search color="#C39A66" size={16} />
                )}

                {isLocationSearchOpen && locationResults.length > 0 && (
                  <View style={styles.locationResults}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.locationResultsScroll}>
                      {locationResults.map((result) => (
                        <TouchableOpacity
                          key={result.id}
                          onPress={() => selectLocation(result)}
                          style={styles.locationResultItem}
                        >
                          <AppText style={styles.locationResultText}>{result.name}</AppText>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setIsPeoplePickerOpen((prev) => !prev)}
                style={[styles.peopleButton, selectedFriends.length > 0 || isPeoplePickerOpen ? styles.peopleButtonActive : null]}
              >
                <Users color="#C39A66" size={19} strokeWidth={1.9} />
                {selectedFriends.length > 0 && (
                  <View style={styles.peopleCount}>
                    <AppText style={styles.peopleCountText}>{selectedFriends.length}</AppText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {isPeoplePickerOpen && (
              <View style={styles.peoplePicker}>
                <TextInput
                  style={styles.friendSearch}
                  placeholder="Search friends"
                  placeholderTextColor="#E8DFC9"
                  value={friendSearch}
                  onChangeText={setFriendSearch}
                  returnKeyType="search"
                />

                <View style={styles.friendList}>
                  {isLoadingFriends ? (
                    <View style={styles.friendEmpty}>
                      <ActivityIndicator size="small" color="#C39A66" />
                    </View>
                  ) : friends.length === 0 ? (
                    <AppText style={styles.friendEmptyText}>No friends to tag yet.</AppText>
                  ) : filteredFriends.length === 0 ? (
                    <AppText style={styles.friendEmptyText}>No matching friends.</AppText>
                  ) : (
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {filteredFriends.map((friend) => {
                        const isSelected = selectedFriends.some((selectedFriend) => selectedFriend.id === friend.id);

                        return (
                          <TouchableOpacity
                            key={friend.id}
                            onPress={() => toggleSelectedFriend(friend)}
                            style={[styles.friendRow, isSelected ? styles.friendRowSelected : null]}
                          >
                            <View style={styles.friendTextBlock}>
                              <AppText style={styles.friendName}>{friend.fullName || friend.handle}</AppText>
                              <AppText style={styles.friendHandle}>@{friend.handle}</AppText>
                            </View>
                            <View style={[styles.friendSelect, isSelected ? styles.friendSelectActive : null]}>
                              {isSelected ? <X color="#071512" size={13} /> : <Users color="#C39A66" size={13} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        <CompletionButton
          label={isCompressingPhotos ? "Preparing Photos" : createLoreEntry.isPending ? "Saving" : "Complete Quest"}
          disabled={!heroImage || createLoreEntry.isPending || isCompressingPhotos}
          onPress={handleSaveAndComplete}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function CompletionShell({ children }: { children: React.ReactNode }) {
  return (
    <Screen scroll={false} className="bg-[#071512]">
      <View style={styles.stageShell}>{children}</View>
    </Screen>
  );
}

function CompletionButton({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <View pointerEvents="box-none" style={styles.bottomButtonWrap}>
      <TouchableOpacity
        activeOpacity={0.86}
        disabled={disabled}
        onPress={onPress}
        style={[styles.completionButton, disabled ? styles.completionButtonDisabled : null]}
      >
        <AppText style={styles.completionButtonText}>{label}</AppText>
        <ArrowRight color="#0E1512" size={23} strokeWidth={1.7} />
      </TouchableOpacity>
    </View>
  );
}

function QuestCompletionCard({
  imageUri,
  title,
  caption,
  locationName,
  extraQuestCount
}: {
  imageUri: string;
  title: string;
  caption: string;
  locationName: string;
  extraQuestCount: number;
}) {
  return (
    <View style={styles.questCard}>
      <View pointerEvents="none" style={styles.questCardScaledInner}>
        <LoreCard
          heroImageUri={imageUri}
          title={title}
          caption={caption}
          locationName={locationName}
          extraQuestCount={extraQuestCount}
        />
      </View>
    </View>
  );
}

function FormPhotoPreview({
  imageUri,
  title,
  caption,
  locationName,
  extraQuestCount
}: {
  imageUri: string;
  title: string;
  caption: string;
  locationName: string;
  extraQuestCount: number;
}) {
  return (
    <View style={styles.formPhotoPreview}>
      <LoreCard
        heroImageUri={imageUri}
        title={title}
        caption={caption}
        locationName={locationName}
        extraQuestCount={extraQuestCount}
      />
    </View>
  );
}

function FlameMark() {
  return (
    <Svg width={112} height={132} viewBox="0 0 112 132">
      <Path
        fill="#FFB13D"
        d="M54 128c-24.4 0-43.7-18.3-43.7-43.1 0-20.3 11.6-35.5 23.8-48.8 8.5-9.4 15.3-18 15.2-29.9 14.6 9.7 20.9 24 19 40.1 3.8-2.2 7.1-5.4 9.1-10.3 13.1 12.2 24.3 26.8 24.3 48.9C101.7 110.9 80.2 128 54 128Z"
      />
      <Path
        fill="#071512"
        d="M54.9 105.6c-12.5 0-22.4-8.7-22.4-20.4 0-2.9 2.6-4.5 5-2.9 5 3.4 10.5 5.5 17 5.5 8.5 0 13.8-4.6 13.8-12.5 0-3-.9-6.3-2.9-10.3 10.2 5.7 17.1 14.7 17.1 24.2 0 9.8-9.7 16.4-27.6 16.4Z"
      />
      <Path
        fill="#FFD978"
        d="M77.9 10.2c6.8 7 9.7 15.8 7 22.8-1 2.7-3.8 3.3-6 1.4-5.1-4.5-7.7-12.5-4.9-22.9.5-1.9 2.4-2.7 3.9-1.3Z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stageShell: {
    flex: 1,
    backgroundColor: "#071512",
    overflow: "hidden"
  },
  formScrollContent: {
    alignItems: "center",
    paddingTop: 14
  },
  formContent: {
    width: "100%",
    paddingHorizontal: 31
  },
  formHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22
  },
  backButton: {
    alignItems: "center",
    borderColor: "rgba(195, 154, 102, 0.56)",
    borderRadius: 999,
    borderWidth: 1,
    height: 25,
    justifyContent: "center",
    width: 25
  },
  formEyebrow: {
    color: "#C39A66",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 10,
    letterSpacing: 0
  },
  headerSpacer: {
    width: 25
  },
  formTitleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  formTitle: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    lineHeight: 34
  },
  formSubtitle: {
    color: "rgba(245, 240, 231, 0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 16
  },
  formCount: {
    color: "#C39A66",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 18
  },
  photoFrame: {
    aspectRatio: 1.16,
    borderColor: "rgba(245, 240, 231, 0.11)",
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 2,
    overflow: "hidden",
    width: "100%"
  },
  photoFrameWithPhotos: {
    aspectRatio: 0.75,
    borderRadius: 24,
    borderWidth: 0
  },
  photoSlide: {
    height: "100%",
    overflow: "hidden"
  },
  photoImage: {
    height: "100%",
    width: "100%"
  },
  addPhotoSlide: {
    alignItems: "center",
    backgroundColor: "rgba(245, 240, 231, 0.02)",
    justifyContent: "center"
  },
  addPhotoIcon: {
    alignItems: "center",
    backgroundColor: "rgba(245, 240, 231, 0.12)",
    borderColor: "rgba(245, 240, 231, 0.35)",
    borderRadius: 999,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    marginBottom: 20,
    width: 54
  },
  addPhotoTitle: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    lineHeight: 20
  },
  addPhotoSubtitle: {
    color: "rgba(245, 240, 231, 0.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 16
  },
  removePhotoButton: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 12,
    width: 30
  },
  photoDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 13
  },
  photoDot: {
    borderRadius: 999,
    height: 7,
    width: 7
  },
  photoDotActive: {
    backgroundColor: "#C39A66"
  },
  photoDotInactive: {
    backgroundColor: "rgba(245, 240, 231, 0.24)"
  },
  inputLabel: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
    marginTop: 21
  },
  captionBox: {
    borderColor: "rgba(245, 240, 231, 0.11)",
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 86,
    paddingHorizontal: 11,
    paddingTop: 11
  },
  captionInput: {
    color: "#F5F0E7",
    flex: 1,
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 11,
    lineHeight: 17,
    padding: 0
  },
  captionCount: {
    bottom: 9,
    color: "rgba(245, 240, 231, 0.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    position: "absolute",
    right: 12
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    zIndex: 10
  },
  locationField: {
    alignItems: "center",
    borderColor: "rgba(245, 240, 231, 0.11)",
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    height: 43,
    paddingHorizontal: 11,
    position: "relative"
  },
  locationInput: {
    color: "#F5F0E7",
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    padding: 0
  },
  locationResults: {
    backgroundColor: "#061E1A",
    borderColor: "rgba(245, 240, 231, 0.16)",
    borderRadius: 9,
    borderWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 48,
    zIndex: 50
  },
  locationResultsScroll: {
    maxHeight: 160
  },
  locationResultItem: {
    borderBottomColor: "rgba(245, 240, 231, 0.1)",
    borderBottomWidth: 1,
    padding: 12
  },
  locationResultText: {
    color: "#F5F0E7",
    fontFamily: "Inter_400Regular",
    fontSize: 12
  },
  peopleButton: {
    alignItems: "center",
    borderColor: "rgba(245, 240, 231, 0.11)",
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 43,
    justifyContent: "center",
    width: 43
  },
  peopleButtonActive: {
    backgroundColor: "rgba(195, 154, 102, 0.12)"
  },
  peopleCount: {
    alignItems: "center",
    backgroundColor: "#C39A66",
    borderRadius: 999,
    height: 17,
    justifyContent: "center",
    minWidth: 17,
    position: "absolute",
    right: -5,
    top: -6
  },
  peopleCountText: {
    color: "#071512",
    fontFamily: "Inter_700Bold",
    fontSize: 9
  },
  peoplePicker: {
    borderColor: "rgba(245, 240, 231, 0.11)",
    borderRadius: 9,
    borderStyle: "dashed",
    borderWidth: 2,
    marginTop: 10,
    padding: 10
  },
  friendSearch: {
    borderColor: "rgba(245, 240, 231, 0.11)",
    borderRadius: 7,
    borderWidth: 1,
    color: "#F5F0E7",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    height: 38,
    paddingHorizontal: 10
  },
  friendList: {
    maxHeight: 170,
    marginTop: 8
  },
  friendEmpty: {
    alignItems: "center",
    paddingVertical: 14
  },
  friendEmptyText: {
    color: "rgba(245, 240, 231, 0.68)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingVertical: 10
  },
  friendRow: {
    alignItems: "center",
    borderBottomColor: "rgba(245, 240, 231, 0.1)",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 10
  },
  friendRowSelected: {
    opacity: 0.66
  },
  friendTextBlock: {
    flex: 1
  },
  friendName: {
    color: "#F5F0E7",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12
  },
  friendHandle: {
    color: "rgba(245, 240, 231, 0.55)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2
  },
  friendSelect: {
    alignItems: "center",
    borderColor: "rgba(195, 154, 102, 0.48)",
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  friendSelectActive: {
    backgroundColor: "#C39A66"
  },
  bottomButtonWrap: {
    bottom: Platform.OS === "ios" ? 27 : 22,
    left: 0,
    paddingHorizontal: 48,
    position: "absolute",
    right: 0,
    zIndex: 30
  },
  completionButton: {
    alignItems: "center",
    backgroundColor: "#EFE0C2",
    borderBottomColor: "rgba(239, 224, 194, 0.54)",
    borderBottomWidth: 5,
    borderRadius: 8,
    flexDirection: "row",
    height: 51,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  completionButtonDisabled: {
    opacity: 0.48
  },
  completionButtonText: {
    color: "#0E1512",
    flex: 1,
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    lineHeight: 25,
    textAlign: "center"
  },
  questCompleteContent: {
    flex: 1,
    paddingHorizontal: 33,
    paddingTop: 36
  },
  shareButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 26,
    top: 27,
    width: 34,
    zIndex: 5
  },
  questCompleteTitleBlock: {
    marginTop: 0
  },
  questCompleteTitle: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    lineHeight: 45
  },
  goldRule: {
    backgroundColor: "#C39A66",
    height: 1,
    marginTop: 9,
    width: 52
  },
  completedCardShot: {
    alignSelf: "center",
    marginTop: 34,
    transform: [{ rotate: "-6deg" }]
  },
  questCard: {
    alignItems: "center",
    aspectRatio: 0.75,
    backgroundColor: "#0A0A0A",
    borderRadius: 10,
    justifyContent: "center",
    overflow: "hidden",
    width: 200
  },
  questCardScaledInner: {
    height: "300%",
    width: "300%",
    transform: [{ scale: 0.3333 }]
  },
  questCardContent: {
    paddingHorizontal: 18,
    paddingTop: 11
  },
  questCardKicker: {
    color: "#F5F0E7",
    fontFamily: "Inter_700Bold",
    fontSize: 5,
    letterSpacing: 0
  },
  questCardTitle: {
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 24,
    textTransform: "uppercase",
    width: 140
  },
  questCardRule: {
    backgroundColor: "rgba(245, 240, 231, 0.38)",
    height: 1,
    left: 86,
    position: "absolute",
    top: 63,
    width: 73
  },
  questCardStatus: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 5,
    letterSpacing: 0,
    marginTop: 12
  },
  formPhotoPreview: {
    backgroundColor: "#0A0A0A",
    flex: 1,
    overflow: "hidden",
    position: "relative"
  },
  formPhotoTopGradient: {
    height: "22%",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  formPhotoBottomGradient: {
    bottom: 0,
    height: "50%",
    left: 0,
    position: "absolute",
    right: 0
  },
  formPhotoLogo: {
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 13,
    left: "5.1%",
    letterSpacing: 5,
    position: "absolute",
    top: "7.6%"
  },
  formPhotoTitleBlock: {
    left: "5.1%",
    position: "absolute",
    right: "4.6%",
    top: "28.2%"
  },
  formPhotoTitle: {
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 31,
    lineHeight: 36,
    textTransform: "uppercase"
  },
  formPhotoStatus: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    letterSpacing: 4,
    lineHeight: 13,
    marginTop: 3
  },
  formPhotoCaptionBlock: {
    alignItems: "flex-end",
    bottom: "10.9%",
    position: "absolute",
    right: "5.2%",
    width: "54%"
  },
  formPhotoQuote: {
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 29,
    height: 24,
    lineHeight: 31
  },
  formPhotoCaption: {
    color: "#FFFFFF",
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 16,
    marginTop: 5,
    textAlign: "right"
  },
  formPhotoLocationBlock: {
    alignItems: "center",
    bottom: "3.6%",
    flexDirection: "row",
    gap: 11,
    justifyContent: "center",
    left: "6%",
    position: "absolute",
    right: "6%"
  },
  formPhotoLocation: {
    color: "#FFFFFF",
    flexShrink: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 8,
    letterSpacing: 3,
    lineHeight: 12,
    textTransform: "uppercase"
  },
  xpRow: {
    alignItems: "baseline",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 64
  },
  xpPlus: {
    color: "rgba(245, 240, 231, 0.75)",
    fontFamily: "Inter_400Regular",
    fontSize: 22,
    lineHeight: 48,
    marginRight: 8
  },
  xpValue: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 43,
    lineHeight: 51
  },
  xpLabel: {
    color: "#D4A157",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    lineHeight: 28,
    marginLeft: 8
  },
  levelBlock: {
    marginHorizontal: 13,
    marginTop: 18
  },
  levelLabel: {
    color: "rgba(245, 240, 231, 0.78)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 8
  },
  levelTrack: {
    backgroundColor: "rgba(147, 177, 157, 0.52)",
    borderRadius: 999,
    height: 8,
    overflow: "hidden"
  },
  levelFill: {
    backgroundColor: "#FFD27D",
    borderRadius: 999,
    height: "100%"
  },
  centerStageContent: {
    alignItems: "center",
    flex: 1,
    paddingTop: 32
  },
  centerTitle: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    lineHeight: 44,
    textAlign: "center"
  },
  streakCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginBottom: 40
  },
  streakNumber: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 52,
    lineHeight: 62,
    marginTop: 24
  },
  streakLabel: {
    color: "#D4A157",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 13,
    lineHeight: 18
  },
  unlockedContent: {
    flex: 1,
    paddingHorizontal: 31,
    paddingTop: 34
  },
  unlockedList: {
    gap: 12,
    paddingBottom: 118,
    paddingTop: 28
  },
  unlockedQuestRow: {
    alignItems: "center",
    backgroundColor: "rgba(245, 240, 231, 0.06)",
    borderColor: "rgba(245, 240, 231, 0.12)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
    overflow: "hidden",
    padding: 10
  },
  unlockedQuestImage: {
    borderRadius: 6,
    height: 68,
    width: 68
  },
  unlockedQuestText: {
    flex: 1
  },
  unlockedQuestTitle: {
    color: "#F5F0E7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    lineHeight: 24
  },
  unlockedQuestDescription: {
    color: "rgba(245, 240, 231, 0.62)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3
  }
});
