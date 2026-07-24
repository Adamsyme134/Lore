import React, { useState, useRef, useEffect } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, View, ScrollView, TextInput, TouchableOpacity, Image, Platform, Modal, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Camera, MapPin, Plus, Search, Users, X } from 'lucide-react-native';
import { useCreateLoreEntry } from '../../../src/features/lore/api/loreApi';
import { useQuest } from '../../../src/features/quests/api/questApi';
import { searchLocations, type LocationSearchResult } from '../../../src/features/location/api/locationSearchApi';
import { Screen } from '../../../src/shared/components/Screen';
import { AppText } from '../../../src/shared/components/AppText';
import { Button } from '../../../src/shared/components/Button';
import { TopBar } from '../../../src/shared/components/TopBar';
import { LoreCard } from '../../../src/features/lore/components/LoreCard';
import { supabase } from '../../../src/lib/supabase'; 
import { useThemeColors } from '../../../src/shared/design/useThemeColors';

const MAX_PHOTOS = 3;

type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

export default function QuestCompletionScreen() {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const previewWidth = Math.max(windowWidth - 32, 1);
  const { questId } = useLocalSearchParams();
  const router = useRouter();
  const viewShotRef = useRef<any>(null);
  const locationSearchRequestId = useRef(0);
  const { data: quest } = useQuest(questId as string);
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

  
  const [questTitle, setQuestTitle] = useState<string>("Loading...");
  const heroImage = selectedPhotos[0]?.uri ?? null;
  const slideCount = selectedPhotos.length < MAX_PHOTOS ? selectedPhotos.length + 1 : selectedPhotos.length;
  const remainingPhotoSlots = MAX_PHOTOS - selectedPhotos.length;
  //const [coordinates, setCoordinates] = useState<string>("");

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
      const nextPhotos = result.assets.slice(0, remainingPhotoSlots).map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType
      }));

      setSelectedPhotos((prev) => [...prev, ...nextPhotos].slice(0, MAX_PHOTOS));
      setActivePhotoIndex(Math.min(insertIndex, MAX_PHOTOS - 1));
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


  const handleSaveAndComplete = () => {
    if (!quest || !heroImage) return;

    try {
      // Package up the images
      const photoAssets = selectedPhotos.map((photo) => ({
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        mimeType: photo.mimeType ?? 'image/jpeg'
      }));

      // Save to Supabase (this handles the completed status and points)
       createLoreEntry.mutateAsync({
        quest,
        title: quest.title,
        journal: caption || "No words needed.",
        location: location || "Unknown Location",
        latitude: selectedLocation?.latitude ?? null,
        longitude: selectedLocation?.longitude ?? null,
        mood: quest.mood,
        tags: [],
        photoAssets
      });
      setShowSuccessModal(true);
      
      // Navigate straight to the user's My Lore tab
      
    } catch (err) {
      console.error("Failed to save lore:", err);
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
    <Screen>
      <TopBar title="Complete Quest" onBack={() => router.back()} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Photo carousel */}
        <View className="flex-row justify-between items-end mb-3 mt-4">
          <AppText className="font-serif text-lg">Select Photos</AppText>
          <AppText className="opacity-40 text-xs tracking-widest">{selectedPhotos.length} / {MAX_PHOTOS}</AppText>
        </View>

        <View className="w-full rounded-xl overflow-hidden shadow-sm">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePhotoScroll}
            scrollEventThrottle={16}
          >
            {selectedPhotos.map((photo, index) => (
              <View key={`${photo.uri}-${index}`} style={{ width: previewWidth }} className="relative">
                {index === 0 ? (
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

            {selectedPhotos.length < MAX_PHOTOS && (
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
          placeholder="What will you remember..."
          placeholderTextColor={colors.textTertiary}
          multiline
          textAlignVertical="top"
          value={caption}
          onChangeText={setCaption}
        />

        {/* Location & Tags Input */}
        <View className="flex-row space-x-3 mt-4 relative z-20">
          <View className="flex-1 relative">
            <View className="bg-surface rounded-xl p-4 border border-line flex-row items-center space-x-3">
              <MapPin color={colors.textTertiary} size={18} />
              <TextInput
                className="flex-1 font-sans text-sm text-ink"
                placeholder="Search location"
                placeholderTextColor={colors.textTertiary}
                value={location}
                onChangeText={handleLocationChange}
                onFocus={() => setIsLocationSearchOpen(locationResults.length > 0)}
              />
              {isLocationSearching ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Search color={colors.textTertiary} size={16} />
              )}
            </View>

            {isLocationSearchOpen && locationResults.length > 0 && (
              <View className="absolute top-full mt-2 left-0 right-0 bg-surface border border-line rounded-xl shadow-lg z-50 overflow-hidden">
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
          <TouchableOpacity className="bg-surface rounded-xl p-4 border border-line flex items-center justify-center w-14">
            <Users color={colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View className="mt-10 mb-6 space-y-4">
          <Button 
            label="Save & Complete Quest"
            onPress={handleSaveAndComplete} 
            disabled={!heroImage || createLoreEntry.isPending}
          >
            <AppText className={`text-center font-bold tracking-widest uppercase ${!heroImage ? 'opacity-40' : 'text-white'}`}>
              {createLoreEntry.isPending ? "Saving..." : "Save & Complete Quest"}
            </AppText>
          </Button>
        </View>

      </ScrollView>
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
