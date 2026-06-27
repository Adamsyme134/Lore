import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AuthLayout() {
  const { isLoading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      
      router.replace("/(app)/(tabs)/today");
      
    }
  }, [isLoading, session, router]);

  // Return null while loading or while the effect is handling the redirect
  if (isLoading || session ) {
    return null;
  }

  return <Slot />;
}