import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../src/features/auth/AuthProvider";

export default function AuthLayout() {
  const { isLoading, isPreviewMode, session } = useAuth();

  if (isLoading) {
    return null;
  }

  if (session || isPreviewMode) {
    return <Redirect href="/today" />;
  }

  return <Slot />;
}
