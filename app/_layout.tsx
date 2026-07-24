import "../global.css";
import "react-native-gesture-handler";

import { useEffect } from "react";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme } from "nativewind";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold
} from "@expo-google-fonts/playfair-display";
import { queryClient } from "../src/lib/queryClient";
import { AuthProvider } from "../src/features/auth/AuthProvider";
import { useThemeStore } from "../src/features/app/store/useThemeStore";
import { darkPalette, lightThemeColors } from "../src/shared/design/tokens";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const themePreference = useThemeStore((state) => state.themePreference);
  const isDark = colorScheme === "dark";
  const themeColors = isDark ? darkPalette : lightThemeColors;
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold
  });

  useEffect(() => {
    setColorScheme(themePreference);
  }, [setColorScheme, themePreference]);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
