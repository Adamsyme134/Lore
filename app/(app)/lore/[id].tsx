import { View, Pressable, Modal, Alert, Platform, ScrollView } from "react-native";
import { useState, useRef } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Chip } from "../../../src/shared/components/Chip";
import { Button } from "../../../src/shared/components/Button";
import { MapPreview } from "../../../src/features/map/components/MapPreview";
import { accentClass } from "../../../src/shared/design/tokens";
import { useLoreEntry, useDeleteLoreEntry } from "../../../src/features/lore/api/loreApi";
import { LoreCard } from "../../../src/features/lore/components/LoreCard";
let MediaLibrary: any;
if (Platform.OS !== 'web') {
  MediaLibrary = require("expo-media-library");
}

export default function LoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry } = useLoreEntry(id);
  const deleteMutation = useDeleteLoreEntry();

  const [isModalVisible, setModalVisible] = useState(false);
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

  if (!entry) {
    return (
      <Screen>
        <TopBar showBack title="Lore" />
        <AppText variant="title">Entry not found.</AppText>
      </Screen>
    );
  }

  const accent = accentClass[entry.accent];

  return (
    <Screen contentClassName="px-0 pb-36">
      <TopBar showBack title="Lore Entry" />
      <View className="px-5">
        <View className="overflow-hidden rounded-[40px] bg-charcoal">
          <View className="h-[470px]">
            <Image source={{ uri: entry.imageUrl }} contentFit="cover" transition={360} style={{ height: "100%", width: "100%", opacity: 0.9 }} />
            <View className="absolute inset-0 bg-charcoal/20" />
            <View className="absolute bottom-0 left-0 right-0 p-6">
              <AppText variant="eyebrow" className="mb-3 text-ivory/80">{entry.date}</AppText>
              <AppText variant="display" className="text-ivory">{entry.title}</AppText>
            </View>
          </View>
        </View>
        <View className="mt-4">
          <Button 
            label="View Lore Card" 
            variant="secondary" 
            onPress={() => setModalVisible(true)} 
          />
        </View>

        <View className="mt-6 flex-row flex-wrap gap-2">
          <Chip label={entry.location} />
          <Chip label={entry.mood} />
          <Chip label={`+${entry.pointsAwarded} LP`} />
          {entry.tags.map((tag) => <Chip key={tag} label={tag} />)}
        </View>

        <View className="mt-6 rounded-card border border-line bg-surface p-6">
          <AppText variant="eyebrow" className={accent.text}>{entry.questTitle}</AppText>
          <AppText variant="subtitle" className="mt-4">What happened</AppText>
          <AppText className="mt-3 text-ink/70">{entry.journal}</AppText>
          {entry.people.length > 0 ? (
            <AppText variant="caption" className="mt-5 font-sansSemi text-ink">
              People: {entry.people.join(", ")}
            </AppText>
          ) : null}
        </View>

        {entry.photos.length > 1 ? (
          <View className="mt-6 rounded-card border border-line bg-surface p-5">
            <AppText variant="eyebrow">Photographs</AppText>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {entry.photos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.uri }} contentFit="cover" style={{ width: 96, height: 116, borderRadius: 24 }} />
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <MapPreview location={entry.location} latitude={entry.latitude} longitude={entry.longitude} />
        </View>
        <View className="mt-12 mb-6">
          <Pressable onPress={handleDelete} className="py-4 items-center border border-red-500/30 rounded-2xl bg-red-500/5">
            <AppText className="text-red-500 font-sansSemi">Delete Lore Entry</AppText>
          </Pressable>
        </View>
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
              />
            </View>

            <View className="mt-8 flex-row gap-6">
              <Pressable onPress={handleDownload} className="h-16 w-16 bg-white rounded-full items-center justify-center">
                <Ionicons name="download-outline" size={28} color="#1C1A17" />
              </Pressable>
              <Pressable onPress={handleShare} className="h-16 w-16 bg-white rounded-full items-center justify-center">
                <Ionicons name="share-outline" size={28} color="#1C1A17" />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
