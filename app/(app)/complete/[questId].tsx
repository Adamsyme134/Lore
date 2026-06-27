import { useMemo, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";
import { Chip } from "../../../src/shared/components/Chip";
import { useQuest } from "../../../src/features/quests/api/questApi";
import { useCreateLoreEntry } from "../../../src/features/lore/api/loreApi";

type SelectedPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

const moodOptions = ["Quiet", "Curious", "Social", "Wild", "Reflective"];

export default function CompleteQuestScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const { data: quest } = useQuest(questId);
  const createLoreEntry = useCreateLoreEntry();
  const [title, setTitle] = useState("");
  const [journal, setJournal] = useState("");
  const [locationName, setLocationName] = useState("");
  const [mood, setMood] = useState("Curious");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const pointsPreview = useMemo(() => {
    if (!quest) {
      return 0;
    }
    return quest.pointsValue + Math.min(3, photos.length) * 2;
  }, [photos.length, quest]);

  if (!quest) {
    return (
      <Screen>
        <TopBar showBack title="Complete" />
        <AppText variant="title">Quest not found.</AppText>
      </Screen>
    );
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photos permission needed", "Allow photo access to attach images to this Lore entry.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.86
    });

    if (!result.canceled) {
      setPhotos((current) => [
        ...current,
        ...result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType
        }))
      ].slice(0, 6));
    }
  }

  async function captureImage() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow camera access to capture quest photographs.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.86
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setPhotos((current) => [
        ...current,
        {
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType
        }
      ].slice(0, 6));
    }
  }

  async function useCurrentLocation() {
    setLocationStatus("Finding your position...");
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setLocationStatus("Location permission was not granted.");
      return;
    }

    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLatitude(current.coords.latitude);
    setLongitude(current.coords.longitude);
    setLocationStatus("Location attached to this memory.");

    if (!locationName) {
      setLocationName("Current location");
    }
  }

async function handleSubmit() {
    // ✨ ADD THIS: Explicit check to satisfy TypeScript
    if (!quest) {
      Alert.alert("Error", "Quest data is missing.");
      return;
    }

    if (!title.trim() || !journal.trim() || !locationName.trim()) {
      Alert.alert("Missing detail", "Add a title, journal note and location before saving the entry.");
      return;
    }

    try {
      const entry = await createLoreEntry.mutateAsync({
        quest, // TypeScript now knows 100% that 'quest' is not null here
        title: title.trim(),
        journal: journal.trim(),
        location: locationName.trim(),
        mood,
        latitude,
        longitude,
        tags: [quest.mood],
        photoAssets: photos
      });

      router.replace({ pathname: "/lore/[id]", params: { id: entry.id } });
    } catch (error) {
      Alert.alert("Could not save Lore entry", error instanceof Error ? error.message : "Try again.");
    }
  }
  return (
    <Screen contentClassName="px-0 pb-36">
      <TopBar showBack title="Complete Quest" />
      <View className="px-5">
        
        {/* ✨ FIX 4: The top Titlecard now embeds the newly selected photo dynamically! */}
        <View className="rounded-[40px] border border-line bg-cream overflow-hidden">
          {photos.length > 0 && (
             <Image source={{ uri: photos[0].uri }} contentFit="cover" style={{ width: '100%', height: 180 }} />
          )}
          <View className="p-6">
            <AppText variant="eyebrow">Turn quest into Lore</AppText>
            <AppText variant="title" className="mt-3">{quest.title}</AppText>
            <AppText className="mt-3 text-ink/70">{quest.journalPrompt}</AppText>
            <View className="mt-5 flex-row flex-wrap gap-2">
              <Chip label={`+${pointsPreview} LP`} />
              <Chip label={photos.length === 1 ? "1 photo" : `${photos.length} photos`} />
            </View>
          </View>
        </View>

        <View className="mt-5 rounded-card border border-line bg-cream p-5">
          <AppText variant="subtitle">Photographs</AppText>
          <AppText className="mt-2 text-ink/65">Add up to six. The first becomes the cover image.</AppText>
          <View className="mt-5 flex-row gap-3">
            <Button label="Choose" variant="secondary" className="flex-1" onPress={pickImage} />
            <Button label="Camera" variant="quiet" className="flex-1" onPress={captureImage} />
          </View>
          {photos.length > 0 ? (
            <View className="mt-5 flex-row flex-wrap gap-3">
              {photos.map((photo, index) => (
                <Pressable key={`${photo.uri}-${index}`} onPress={() => setPhotos((current) => current.filter((item) => item.uri !== photo.uri))}>
                  <Image source={{ uri: photo.uri }} contentFit="cover" style={{ width: 96, height: 116, borderRadius: 24 }} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View className="mt-5 rounded-card border border-line bg-cream p-5">
          <AppText variant="subtitle">Field note</AppText>
          <TextInput
            placeholder="Title"
            placeholderTextColor="#787267"
            value={title}
            onChangeText={setTitle}
            className="mt-5 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
          />
          <TextInput
            multiline
            textAlignVertical="top"
            placeholder="What happened?"
            placeholderTextColor="#787267"
            value={journal}
            onChangeText={setJournal}
            className="mt-3 min-h-[150px] rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] leading-6 text-ink"
          />
          <TextInput
            placeholder="Location name"
            placeholderTextColor="#787267"
            value={locationName}
            onChangeText={setLocationName}
            className="mt-3 rounded-3xl border border-line bg-ivory px-5 py-4 font-sans text-[15px] text-ink"
          />
          <Button label="Use current location" variant="secondary" className="mt-4" onPress={useCurrentLocation} />
          {locationStatus ? <AppText className="mt-3 text-ink/65">{locationStatus}</AppText> : null}

          <View className="mt-5 flex-row flex-wrap gap-2">
            {moodOptions.map((option) => (
              <Pressable key={option} onPress={() => setMood(option)}>
                <View className={mood === option ? "rounded-full bg-ink px-4 py-2" : "rounded-full border border-line bg-ivory px-4 py-2"}>
                  <AppText variant="caption" className={mood === option ? "font-sansSemi text-ivory" : "font-sansSemi text-ink"}>{option}</AppText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <Button label={createLoreEntry.isPending ? "Saving" : "Save Lore entry"} className="mt-6" onPress={handleSubmit} disabled={createLoreEntry.isPending} />
      </View>
    </Screen>
  );
}