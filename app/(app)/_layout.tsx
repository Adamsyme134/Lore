
import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { AppText } from "../../src/shared/components/AppText";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AppLayout() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory px-8">
        <AppText variant="eyebrow">Lore</AppText>
        <AppText variant="title" className="mt-3 text-center">Preparing your field notes.</AppText>
      </View>
    );
  }

  // Strictly require a session to view anything inside (app)
  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return <Slot />;
}