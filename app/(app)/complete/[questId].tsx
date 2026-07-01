import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Image, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Camera, MapPin, Users, Plus, X } from 'lucide-react-native';
import { useCreateLoreEntry } from '../../../src/features/lore/api/loreApi';
import { useQuest } from '../../../src/features/quests/api/questApi';
import { Screen } from '../../../src/shared/components/Screen';
import { AppText } from '../../../src/shared/components/AppText';
import { Button } from '../../../src/shared/components/Button';
import { TopBar } from '../../../src/shared/components/TopBar';
import { LoreCard } from '../../../src/features/lore/components/LoreCard';
import { supabase } from '../../../src/lib/supabase'; 
export default function QuestCompletionScreen() {
  const { questId } = useLocalSearchParams();
  const router = useRouter();
  const viewShotRef = useRef<any>(null);
  const { data: quest } = useQuest(questId as string);
  const createLoreEntry = useCreateLoreEntry();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Form State
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');

  
  const [questTitle, setQuestTitle] = useState<string>("Loading...");
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

  const pickImage = async (isHero: boolean) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isHero ? [3, 4] : [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      if (isHero) {
        setHeroImage(result.assets[0].uri);
      } else {
        if (extraImages.length < 3) {
          setExtraImages([...extraImages, result.assets[0].uri]);
        }
      }
    }
  };

  const removeExtraImage = (index: number) => {
    setExtraImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleSaveAndComplete = async () => {
    if (!quest || !heroImage) return;

    try {
      // Package up the images
      const photoAssets = [
        { uri: heroImage, mimeType: 'image/jpeg' },
        ...extraImages.map(uri => ({ uri, mimeType: 'image/jpeg' }))
      ];

      // Save to Supabase (this handles the completed status and points)
      await createLoreEntry.mutateAsync({
        quest,
        title: quest.title,
        journal: caption || "No words needed.",
        location: location || "Unknown Location",
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
        
        {/* Header with dynamic "Change" button */}
        <View className="flex-row justify-between items-end mb-3 mt-4">
          <AppText className="font-serif text-lg">The Hero Shot</AppText>
          {heroImage && (
            <TouchableOpacity onPress={() => pickImage(true)}>
              <AppText className="opacity-40 text-xs tracking-widest uppercase">Change Image</AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* Live Preview / Hero Image Selector */}
        {heroImage ? (
          <View className="w-full rounded-xl overflow-hidden shadow-sm">
            <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }}>
              <LoreCard 
                heroImageUri={heroImage}
                title={questTitle}
                caption={caption || "No words needed."}
                locationName={location || "UNKNOWN LOCATION"}

              />
            </ViewShot>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={() => pickImage(true)}
            className="w-full h-32 rounded-xl border border-dashed border-black/10 bg-black/5 flex items-center justify-center transition-all"
          >
            <View className="items-center space-y-3">
              <Camera color="rgba(0,0,0,0.3)" size={32} />
              <AppText className="opacity-40 tracking-widest text-xs uppercase">Select Main Image</AppText>
            </View>
          </TouchableOpacity>
        )}

        {/* Additional B-Roll Images */}
        <View className="mt-8 flex-row justify-between items-center mb-3">
          <AppText className="font-serif text-lg">Additional Photos</AppText>
          <AppText className="opacity-40 text-xs tracking-widest">{extraImages.length} / 3</AppText>
        </View>
        <View className="flex-row space-x-3 h-24">
          {extraImages.map((uri, index) => (
            <View key={index} className="w-24 h-24 rounded-lg overflow-hidden relative border border-black/5">
              <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
              <TouchableOpacity 
                className="absolute top-1 right-1 bg-black/50 p-1 rounded-full"
                onPress={() => removeExtraImage(index)}
              >
                <X color="white" size={12} />
              </TouchableOpacity>
            </View>
          ))}
          {extraImages.length < 3 && (
            <TouchableOpacity 
              onPress={() => pickImage(false)}
              className="w-24 h-24 rounded-lg border border-dashed border-black/10 items-center justify-center bg-black/5"
            >
              <Plus color="rgba(0,0,0,0.3)" size={20} />
            </TouchableOpacity>
          )}
        </View>

        {/* Caption Input */}
        <AppText className="font-serif text-lg mb-3 mt-8">Caption</AppText>
        <TextInput
          className="w-full bg-black/5 rounded-xl p-4 font-serif text-base border border-black/5 min-h-[100px] text-black"
          placeholder="What will you remember..."
          placeholderTextColor="rgba(0,0,0,0.3)"
          multiline
          textAlignVertical="top"
          value={caption}
          onChangeText={setCaption}
        />

        {/* Location & Tags Input */}
        <View className="flex-row space-x-3 mt-4">
          <View className="flex-1 bg-black/5 rounded-xl p-4 border border-black/5 flex-row items-center space-x-3">
            <MapPin color="rgba(0,0,0,0.3)" size={18} />
            <TextInput
              className="flex-1 font-sans text-sm text-black"
              placeholder="Location (e.g., Mexico City)"
              placeholderTextColor="rgba(0,0,0,0.3)"
              value={location}
              onChangeText={setLocation}
            />
          </View>
          <TouchableOpacity className="bg-black/5 rounded-xl p-4 border border-black/5 flex items-center justify-center w-14">
            <Users color="rgba(0,0,0,0.3)" size={18} />
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
            <View className="w-16 h-16 rounded-full bg-forest items-center justify-center mb-4">
              <AppText className="text-ivory text-2xl font-serif">✓</AppText>
            </View>
            
            <AppText variant="title" className="text-center mb-2">Saved to Archive</AppText>
            <AppText className="text-center text-ink/70 mb-8 max-w-[250px]">
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
                <AppText className="text-center text-ink/60 font-sansSemi">Maybe Later</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </Screen>
  );
}