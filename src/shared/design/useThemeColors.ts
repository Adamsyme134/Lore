import { useColorScheme } from "nativewind";
import { darkPalette, lightThemeColors } from "./tokens";

export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return {
    ...(colorScheme === "dark" ? darkPalette : lightThemeColors),
    isDark: colorScheme === "dark"
  };
}
