import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { AppText } from "./AppText";
import { useAuth } from "../../features/auth/AuthProvider";

type TopBarProps = {
  title?: string;
  showBack?: boolean;
  rightLabel?: string;
  showProfile?: boolean; // <-- NEW PROP
};

export function TopBar({ title = "Lore", showBack = false, rightLabel, showProfile = false }: TopBarProps) {
  const { profile } = useAuth();

  return (
    <View className="mb-4 flex-row items-center justify-between px-5 pt-2">
      <View className="w-16">
        {showBack ? (
          <Pressable onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-cream">
            <AppText variant="subtitle">‹</AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText variant="eyebrow" className="text-ink">{title}</AppText>
      <View className="w-16 items-end justify-center">
        {showProfile && profile ? (
          <Pressable onPress={() => router.push("/profile")} className="h-9 w-9 items-center justify-center rounded-full bg-burgundy">
            <AppText className="font-sansSemi text-ivory">
              {profile.fullName.charAt(0).toUpperCase()}
            </AppText>
          </Pressable>
        ) : rightLabel ? (
          <AppText variant="caption" className="font-sansSemi text-ink">{rightLabel}</AppText>
        ) : null}
      </View>
    </View>
  );
}