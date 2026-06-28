import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { View, ActivityIndicator } from "react-native";

export default function AppLayout() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    // If loading is finished and there is no session, boot them to login
    if (!isLoading && !session) {
      router.replace("/(auth)/sign-in");
    }
  }, [session, isLoading]);

  // Do not try to render the protected Stack if they aren't authenticated
  if (isLoading || !session) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#1C1A17" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}