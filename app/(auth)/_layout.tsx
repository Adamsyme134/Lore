import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { View, ActivityIndicator } from "react-native";

export default function AuthLayout() {
  const { session, isLoading } = useAuth();

  return (
    <>
      {!isLoading && session ? <Redirect href="/(app)/(tabs)/today" /> : null}
      <Stack screenOptions={{ headerShown: false }} />
      {isLoading ? (
        <View className="absolute inset-0 items-center justify-center bg-surface">
          <ActivityIndicator size="large" color="#1C1A17" />
        </View>
      ) : null}
    </>
  );
}
