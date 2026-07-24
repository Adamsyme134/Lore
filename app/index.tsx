import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/features/auth/AuthProvider";
import { useThemeColors } from "../src/shared/design/useThemeColors";

export default function Index() {
  const { session, isLoading } = useAuth();
  const colors = useThemeColors();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.replace("/(app)/(tabs)/today");
      } else {
        router.replace("/(auth)/sign-in");
      }
    }
  }, [session, isLoading]);

  // Show a blank screen or a spinner while the effect runs
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
