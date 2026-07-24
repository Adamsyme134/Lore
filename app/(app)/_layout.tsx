import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";
import { View, ActivityIndicator } from "react-native";
import { useThemeColors } from "../../src/shared/design/useThemeColors";

export default function AppLayout() {
  const { session, isLoading } = useAuth();
  const colors = useThemeColors();

  return (
    <>
      {!isLoading && !session ? <Redirect href="/(auth)/sign-in" /> : null}
      <Stack screenOptions={{ headerShown: false }} />
      {isLoading ? (
        <View className="absolute inset-0 items-center justify-center bg-surface">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : null}
    </>
  );
}
