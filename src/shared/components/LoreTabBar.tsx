// src/shared/components/LoreTabBar.tsx
import { Pressable, View } from "react-native";
import { AppText } from "./AppText";

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
    emit: (options: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

// ✨ Updated labels to match Sketch 1 Bottom Tab Bar exactly
const labels: Record<string, string> = {
  today: "Today",
  explore: "Explore",
  archive: "My Lore", 
  map: "Map",
  friends: "Friends"
};

export function LoreTabBar({ state, navigation }: LoreTabBarProps) {
  // We can filter out map if you only want the 4 tabs shown in the sketch
  const visibleRoutes = state.routes.filter(route => route.name !== 'map');

  return (
    <View className="absolute bottom-6 left-5 right-5 rounded-full border border-line bg-background/95 px-2 py-2 shadow-lg shadow-charcoal/10">
      <View className="flex-row items-center justify-between">
        {visibleRoutes.map((route, index) => {
          // adjust active index check since we filtered routes
          const originalIndex = state.routes.findIndex(r => r.key === route.key);
          const focused = state.index === originalIndex;
          const label = labels[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable key={route.key} onPress={onPress} className="flex-1 overflow-hidden rounded-full">
              {({ pressed }) => (
                <View className={focused ? "items-center rounded-full bg-ink px-2 py-3" : pressed ? "items-center rounded-full bg-surface px-2 py-3" : "items-center rounded-full px-2 py-3"}>
                  <AppText variant="caption" className={focused ? "font-sansSemi text-ivory" : "font-sansSemi text-muted"}>
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