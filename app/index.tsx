import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function IndexRoute() {
  const { isLoading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.replace("/(app)/(tabs)/today");
      } else {
        router.replace("/sign-in");
      }
    }
  }, [isLoading, session, router]);

  // Render a blank screen matching your ivory background while determining auth state
  return <View style={{ flex: 1, backgroundColor: '#F5F0E7' }} />; 
}