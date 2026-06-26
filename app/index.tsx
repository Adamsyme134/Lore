import { Redirect } from "expo-router";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function IndexRoute() {
  const { isLoading, isPreviewMode, session } = useAuth();

  if (isLoading) {
    return null;
  }

  if (session || isPreviewMode) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/sign-in" />;
}
