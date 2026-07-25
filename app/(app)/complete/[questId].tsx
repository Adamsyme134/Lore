import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, View, ScrollView, TextInput, TouchableOpacity, Image, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Camera, MapPin, Plus, Search, Users, X } from 'lucide-react-native';
import { useCreateLoreEntry } from '../../../src/features/lore/api/loreApi';
import { useQuest } from '../../../src/features/quests/api/questApi';
import { searchLocations, type LocationSearchResult } from '../../../src/features/location/api/locationSearchApi';
import { useFriendsList } from '../../../src/features/social/api/socialApi';
import { Screen } from '../../../src/shared/components/Screen';
import { AppText } from '../../../src/shared/components/AppText';
import { Button } from '../../../src/shared/components/Button';
import { TopBar } from '../../../src/shared/components/TopBar';
import { LoreCard } from '../../../src/features/lore/components/LoreCard';
import { supabase } from '../../../src/lib/supabase'; 
import { useThemeColors } from '../../../src/shared/design/useThemeColors';
import type { Profile } from '../../../src/shared/types/domain';

const MAX_PHOTOS = 3;
const MAX_UPLOAD_IMAGE_EDGE = 1800;
const UPLOAD_IMAGE_QUALITY = 0.78;

type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

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
  const colors = useThemeColors();
  const { questId } = useLocalSearchParams();
  const router = useRouter();
  const viewShotRef = useRef<any>(null);
  const completionScrollRef = useRef<ScrollView | null>(null);
  const scrollContentRef = useRef<View | null>(null);
  const locationFieldRef = useRef<View | null>(null);
  const locationSearchRequestId = useRef(0);
  const { data: quest } = useQuest(questId as string);
  const { data: friends = [], isLoading: isLoadingFriends } = useFriendsList();
  const createLoreEntry = useCreateLoreEntry();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
       await createLoreEntry.mutateAsync({
        quest,
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
      setShowSuccessModal(true);
      
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
        
        // After sharing, close modal and head to archive
        setShowSuccessModal(false);
        router.push('/(app)/(tabs)/archive');
        
      } catch (err) {
        console.error("Failed to share", err);
      }
    }
  };
  return (
    <Screen scroll={false}>
      <TopBar title="Complete Quest" onBack={() => router.back()} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={completionScrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: isPeoplePickerOpen || isLocationSearchOpen ? 520 : 280 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View ref={scrollContentRef} collapsable={false} className="px-3">
        
        {/* Photo carousel */}
        <View className="flex-row justify-between items-end mb-3 mt-4">
          <AppText className="font-serif text-lg">Select Photos</AppText>
          <AppText className="opacity-40 text-xs tracking-widest">{selectedPhotos.length} / {MAX_PHOTOS}</AppText>
        </View>

        <View
          className="w-full rounded-xl overflow-hidden shadow-sm"
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
              <View key={`${photo.uri}-${index}`} style={{ width: previewWidth }} className="relative">
                {index === heroPhotoIndex ? (
                  <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }}>
                    <LoreCard 
                      heroImageUri={photo.uri}
                      title={questTitle}
                      caption={caption || "No words needed."}
                      locationName={location || "UNKNOWN LOCATION"}
                    />
                  </ViewShot>
                ) : (
                  <View className="w-full aspect-[3/4] bg-[#0a0a0a] overflow-hidden">
                    <Image source={{ uri: photo.uri }} className="w-full h-full" resizeMode="cover" />
                  </View>
                )}

                <TouchableOpacity
                  accessibilityLabel="Remove photo"
                  onPress={() => removePhoto(index)}
                  className="absolute top-4 right-4 bg-black/45 p-2 rounded-full"
                >
                  <X color="white" size={16} />
                </TouchableOpacity>
              </View>
            ))}

            {photoFrameWidth > 0 && selectedPhotos.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={pickPhotos}
                activeOpacity={0.82}
                style={{ width: previewWidth }}
                className="aspect-[3/4] bg-surface border border-dashed border-line items-center justify-center"
              >
                <View className="items-center space-y-3">
                  {selectedPhotos.length === 0 ? (
                    <Camera color={colors.textTertiary} size={36} />
                  ) : (
                    <Plus color={colors.textTertiary} size={36} />
                  )}
                  <AppText className="text-tertiary tracking-widest text-xs uppercase">
                    {selectedPhotos.length === 0 ? 'Select Photos' : `Add ${remainingPhotoSlots} More`}
                  </AppText>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View className="flex-row justify-center items-center mt-3 space-x-2">
          {Array.from({ length: slideCount }).map((_, index) => (
            <View
              key={index}
              className={`rounded-full ${activePhotoIndex === index ? 'bg-ink w-2.5 h-2.5' : 'bg-line w-1.5 h-1.5'}`}
            />
          ))}
        </View>

        {selectedPhotos.length > 0 && selectedPhotos.length < MAX_PHOTOS && (
          <View className="flex-row justify-center mt-3">
            <TouchableOpacity onPress={pickPhotos} className="flex-row items-center space-x-2 py-2 px-3">
              <Plus color={colors.textTertiary} size={16} />
              <AppText className="opacity-50 text-xs tracking-widest uppercase">
                Add {remainingPhotoSlots} photo{remainingPhotoSlots === 1 ? '' : 's'}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption Input */}
        <AppText className="font-serif text-lg mb-3 mt-8">Caption</AppText>
        <TextInput
          className="w-full bg-surface rounded-xl p-4 font-serif text-base border border-line min-h-[100px] text-ink"
          placeholder="..."
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          value={caption}
          onChangeText={setCaption}
        />

        {/* Location & People Input */}
        <View ref={locationFieldRef} collapsable={false} className="flex-row space-x-3 mt-4 relative z-20">
          <View className="flex-1 relative">
            <View className="bg-surface rounded-xl p-4 border border-line flex-row items-center space-x-3">
              <MapPin color={colors.textTertiary} size={18} />
              <TextInput
                className="flex-1 font-sans text-sm text-ink"
                placeholder="Search location"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={handleLocationChange}
                onFocus={() => {
                  setIsLocationSearchOpen(locationResults.length > 0);
                  scrollLocationIntoView();
                }}
              />
              {isLocationSearching ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Search color={colors.textTertiary} size={16} />
              )}
            </View>

            {isLocationSearchOpen && locationResults.length > 0 && (
              <View
                className="absolute left-0 right-0 bg-surface border border-line rounded-xl shadow-lg z-50 overflow-hidden"
                style={Platform.OS === 'android' ? { bottom: '100%', marginBottom: 8 } : { top: '100%', marginTop: 8 }}
              >
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" className="max-h-48">
                  {locationResults.map((result) => (
                    <TouchableOpacity
                      key={result.id}
                      onPress={() => selectLocation(result)}
                      className="p-4 border-b border-line/50"
                    >
                      <AppText className="text-ink font-sans text-sm">{result.name}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setIsPeoplePickerOpen((prev) => !prev)}
            className={`rounded-xl p-4 border border-line flex items-center justify-center w-14 relative ${isPeoplePickerOpen || selectedFriends.length > 0 ? 'bg-accent' : 'bg-surface'}`}
          >
            <Users color={isPeoplePickerOpen || selectedFriends.length > 0 ? colors.accentText : colors.textTertiary} size={18} />
            {selectedFriends.length > 0 && (
              <View className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-ink items-center justify-center">
                <AppText className="text-[10px] text-background font-sansSemi">{selectedFriends.length}</AppText>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isPeoplePickerOpen && (
          <View className="mt-3 bg-surface rounded-xl p-4 border border-line">
            <View className="flex-row items-center space-x-2 mb-3">
              <Users color={colors.textTertiary} size={16} />
              <AppText className="font-sansSemi text-sm text-ink">Tag Friends</AppText>
            </View>

            <TextInput
              className="bg-background rounded-lg border border-line px-3 py-3 font-sans text-sm text-ink"
              placeholder="Search friends"
              placeholderTextColor={colors.textTertiary}
              value={friendSearch}
              onChangeText={setFriendSearch}
              returnKeyType="search"
            />

            {selectedFriends.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-3">
                {selectedFriends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => toggleSelectedFriend(friend)}
                    className="flex-row items-center rounded-full bg-accent/20 border border-accent/40 px-3 py-2"
                  >
                    <AppText className="text-xs text-ink font-sansSemi">{friend.fullName || friend.handle}</AppText>
                    <X color={colors.textTertiary} size={12} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View className="mt-3 max-h-52">
              {isLoadingFriends ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                </View>
              ) : friends.length === 0 ? (
                <AppText className="text-muted text-sm py-3">No friends to tag yet.</AppText>
              ) : filteredFriends.length === 0 ? (
                <AppText className="text-muted text-sm py-3">No matching friends.</AppText>
              ) : (
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {filteredFriends.map((friend) => {
                    const isSelected = selectedFriends.some((selectedFriend) => selectedFriend.id === friend.id);

                    return (
                      <TouchableOpacity
                        key={friend.id}
                        onPress={() => toggleSelectedFriend(friend)}
                        className={`flex-row items-center justify-between py-3 border-b border-line/50 ${isSelected ? 'opacity-60' : ''}`}
                      >
                        <View className="flex-1 pr-3">
                          <AppText className="text-ink font-sansSemi text-sm">{friend.fullName || friend.handle}</AppText>
                          <AppText className="text-muted text-xs mt-0.5">@{friend.handle}</AppText>
                        </View>
                        <View className={`w-7 h-7 rounded-full items-center justify-center border ${isSelected ? 'bg-accent border-accent' : 'bg-background border-line'}`}>
                          {isSelected ? (
                            <X color={colors.accentText} size={14} />
                          ) : (
                            <Plus color={colors.textTertiary} size={14} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="mt-10 mb-6 space-y-4">
          <Button 
            label="Save & Complete Quest"
            onPress={handleSaveAndComplete} 
            disabled={!heroImage || createLoreEntry.isPending || isCompressingPhotos}
          >
            <AppText className={`text-center font-bold tracking-widest uppercase ${!heroImage ? 'opacity-40' : 'text-white'}`}>
              {isCompressingPhotos ? "Preparing photos..." : createLoreEntry.isPending ? "Saving..." : "Save & Complete Quest"}
            </AppText>
          </Button>
        </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    {/* ✨ NEW: Success & Share Popup */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <View className="w-full bg-surface rounded-[32px] p-6 items-center shadow-lg">
            <View className="w-16 h-16 rounded-full bg-accent items-center justify-center mb-4">
              <AppText className="text-accentText text-2xl font-serif">✓</AppText>
            </View>
            
            <AppText variant="title" className="text-center mb-2">Saved to Archive</AppText>
            <AppText className="text-center text-muted mb-8 max-w-[250px]">
              Your memory is securely stored. Want to share your Lore Card with friends?
            </AppText>
            
            <View className="w-full space-y-3">
              <Button label="Share Lore Card" onPress={handleShare} />
              
              <TouchableOpacity 
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/(app)/(tabs)/archive');
                }}
                className="py-4 mt-2 border border-line rounded-full items-center justify-center bg-transparent"
              >
                <AppText className="text-center text-muted font-sansSemi">Maybe Later</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}
