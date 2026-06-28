import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function Index() {
  const { session, isLoading } = useAuth();

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
    <View className="flex-1 items-center justify-center bg-cream">
      <ActivityIndicator size="large" color="#1C1A17" />
    </View>
  );
}