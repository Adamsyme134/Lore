
import { Redirect } from "expo-router";
import { useAuth } from "../src/features/auth/AuthProvider";

export default function IndexRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return null;
  }

  // If the user has a valid Supabase session, send them to the main app layout
  if (session) {
    return <Redirect href="/(app)/(tabs)/today" />; // Adjust to your actual initial tab/screen
  }

  // Otherwise, force them to log in
  return <Redirect href="/sign-in" />;
}