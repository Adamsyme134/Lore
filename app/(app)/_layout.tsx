import { Slot, useRouter } from "expo-router";
import { View } from "react-native";
import { useEffect } from "react";
import { AppText } from "../../src/shared/components/AppText";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AppLayout() {
  const { isLoading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/sign-in");
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ivory px-8">
        <AppText variant="eyebrow">Lore</AppText>
        <AppText variant="title" className="mt-3 text-center">Preparing your field notes.</AppText>
      </View>
    );
  }

  // Return null while the useEffect catches the unauthenticated state and redirects
  if (!session) {
    return null; 
  }

  return <Slot />;
}