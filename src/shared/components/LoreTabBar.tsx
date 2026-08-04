// src/shared/components/LoreTabBar.tsx
import { Pressable, View } from "react-native";
import { Files, GitBranch, Home, Search, Users } from "lucide-react-native";
import { AppText } from "./AppText";
import { useThemeColors } from "../design/useThemeColors";

type LoreTabRoute = {
  key: string;
  name: string;
};

type LoreTabBarProps = {
  state: {
    index: number;
    routes: LoreTabRoute[];
  };
  navigation: {
    emit: (options: { type: "tabPress"; target?: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const labels: Record<string, string> = {
  today: "Home",
  journeys: "Tree",
  explore: "Explore",
  archive: "My Lore",
  friends: "Friends"
};

const icons: Record<string, typeof Home> = {
  today: Home,
  journeys: GitBranch,
  explore: Search,
  archive: Files,
  friends: Users
};

export function LoreTabBar({ state, navigation }: LoreTabBarProps) {
  const colors = useThemeColors();
  const visibleRoutes = state.routes.filter(route => route.name !== 'map');
  const barBackground = colors.isDark ? "#000000" : colors.background;
  const barBorder = colors.isDark ? "#2B2B2B" : colors.secondaryUi;
  const inactiveColor = colors.isDark ? "#FFFFFF" : "#000000";

  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t px-3 shadow-lg shadow-charcoal/20"
      style={{ backgroundColor: barBackground, borderColor: barBorder, height: 85, paddingBottom: 6 }}
    >
      <View className="flex-row items-center justify-between">
        {visibleRoutes.map((route) => {
          const focused = state.index === state.routes.findIndex((item) => item.key === route.key);
          const label = labels[route.name] ?? route.name;
          const Icon = icons[route.name] ?? Home;
          const itemColor = focused ? colors.accent : inactiveColor;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} className="flex-1 overflow-hidden rounded-full">
              {({ pressed }) => (
                <View className="items-center justify-center px-1" style={{ height: 77, opacity: pressed ? 0.72 : 1 }}>
                  <Icon size={31} color={itemColor} strokeWidth={1.62} />
                  <AppText variant="caption" className="font-sans" style={{ color: itemColor, fontSize: 12.6, lineHeight: 15.3, marginTop: 7 }}>
                    {label}
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
