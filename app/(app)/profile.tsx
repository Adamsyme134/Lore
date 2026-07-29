import { useState } from "react";
import { Alert, Platform, Pressable, TouchableOpacity, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/shared/components/Screen";
import { AppText } from "../../src/shared/components/AppText";
import { TopBar } from "../../src/shared/components/TopBar";
import { Button } from "../../src/shared/components/Button";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { requireSupabase } from "../../src/lib/supabase";
import { debugResetCardProgress } from "src/features/quests/context/QuestExecutionContext";
import { useColorScheme } from "nativewind";
import { useThemeStore } from "src/features/app/store/useThemeStore";
import { useQuitAllActiveQuests } from "../../src/features/quests/api/questApi";
import { useThemeColors } from "../../src/shared/design/useThemeColors";
import { getExperienceProgress } from "../../src/features/points/components/ExperienceProgressCard";

export default function ProfileScreen() {
  
  const { profile, signOut, user, refreshProfile } = useAuth();
  const { setColorScheme } = useColorScheme();
  const { themePreference, setThemePreference } = useThemeStore();
  const colors = useThemeColors();
  const quitAllActiveQuests = useQuitAllActiveQuests();
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  if (!profile) return null;

  const { level, nextLevel, xpToNextLevel } = getExperienceProgress(profile.pointsTotal);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setColorScheme(theme);
    setThemePreference(theme);
  };

  const handleResetStepProgress = () => {
    const reset = () => {
      quitAllActiveQuests.mutate(undefined, {
        onSettled: () => {
          void debugResetCardProgress();
        }
      });
    };

    if (Platform.OS === "web") {
      if ((globalThis as any).confirm?.("Reset all quest progress and clear saved step progress?") !== false) {
        reset();
      }
      return;
    }

    Alert.alert(
      "Reset all quest progress?",
      "This will quit every in-progress quest and clear saved step progress.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: reset
        }
      ]
    );
  };

  const handleChangeAvatar = async () => {
    if (!user) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7
    });

    if (result.canceled) return;

    try {
      setIsUpdatingAvatar(true);
      const asset = result.assets[0];
      const client = requireSupabase();
      const extension = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
      const contentType = asset.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`;
      const storagePath = `${user.id}/profile/avatar-${Date.now()}.${extension}`;
      const arrayBuffer = await fetch(asset.uri).then((response) => response.arrayBuffer());

      const { error: uploadError } = await client.storage
        .from("lore-photos")
        .upload(storagePath, arrayBuffer, {
          contentType,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data } = client.storage.from("lore-photos").getPublicUrl(storagePath);
      const { error: profileError } = await client
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);

      if (profileError) throw profileError;
      await refreshProfile();
    } catch (error) {
      console.error("Could not update profile photo", error);
      if (Platform.OS === "web") {
        (globalThis as any).alert?.("Could not update profile photo.");
      } else {
        Alert.alert("Could not update profile photo", error instanceof Error ? error.message : "Please try again.");
      }
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  return (
    <Screen contentClassName="pt-3">
      <TopBar showBack title="Explorer Profile" />
      
      <View className="mt-8 items-center px-5">
        <View className="relative mb-4">
          <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-burgundy">
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} className="h-full w-full" contentFit="cover" />
            ) : (
              <AppText variant="display" className="text-ivory text-4xl">
                {profile.fullName.charAt(0).toUpperCase()}
              </AppText>
            )}
          </View>
          <TouchableOpacity
            onPress={handleChangeAvatar}
            disabled={isUpdatingAvatar}
            className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-surface"
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={14} color={colors.text} />
          </TouchableOpacity>
        </View>
        <AppText variant="display">{profile.fullName}</AppText>
        <AppText className="mt-1 text-muted">@{profile.handle}</AppText>
      </View>

      <View className="mt-10 px-5">
        <View className="rounded-card border border-line bg-surface p-5">
          <AppText variant="eyebrow" className="mb-2">Lore Mastery</AppText>
          <View className="flex-row items-end justify-between border-b border-line pb-4">
            <AppText variant="title">Level {level}</AppText>
            <AppText variant="subtitle" className="text-burgundy">{profile.pointsTotal} pts</AppText>
          </View>
          <AppText className="mt-4 text-muted">
            You need <AppText className="font-sansSemi">{xpToNextLevel} more XP</AppText> to reach Level {nextLevel}. Complete quests and add photos to your entries to level up.
          </AppText>
        </View>
      </View>
      {/* NEW THEME TOGGLE */}
      <View className="mt-6 px-5">
        <AppText variant="eyebrow" className="mb-2">Appearance</AppText>
        <View className="flex-row rounded-xl border border-line bg-surface overflow-hidden">
          {['system', 'light', 'dark'].map((t) => (
            <Pressable
              key={t}
              onPress={() => handleThemeChange(t as any)}
              className={`flex-1 items-center justify-center py-3 ${themePreference === t ? 'bg-accent' : 'bg-transparent'}`}
            >
              <AppText className={`capitalize font-sansSemi text-xs ${themePreference === t ? 'text-accentText' : 'text-ink'}`}>
                {t}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="mt-auto px-5 pb-8 pt-10">
        <Button label="Sign Out" variant="secondary" onPress={signOut} />
      </View>
      <Button 
        label={quitAllActiveQuests.isPending ? "Resetting..." : "Reset All Step Progress"} 
        onPress={handleResetStepProgress}
        disabled={quitAllActiveQuests.isPending}
      />
    </Screen>
  );
}
