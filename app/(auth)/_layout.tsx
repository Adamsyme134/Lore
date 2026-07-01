import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { View, ActivityIndicator } from "react-native";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // If they already have a session, push them straight to the app
    if (!isLoading && session) {
      router.replace("/(app)/(tabs)/today");
    }
  }, [session, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#1C1A17" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}