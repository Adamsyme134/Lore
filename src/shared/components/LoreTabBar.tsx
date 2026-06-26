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

const labels: Record<string, string> = {
  today: "Today",
  explore: "Explore",
  archive: "Lore",
  map: "Map",
  friends: "People"
};

export function LoreTabBar({ state, navigation }: LoreTabBarProps) {
  return (
    <View className="absolute bottom-6 left-5 right-5 rounded-full border border-line bg-ivory/95 px-2 py-2 shadow-lg shadow-charcoal/10">
      <View className="flex-row items-center justify-between">
        {state.routes.map((route, index) => {
          const focused = state.index === index;
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
                <View className={focused ? "items-center rounded-full bg-ink px-2 py-3" : pressed ? "items-center rounded-full bg-cream px-2 py-3" : "items-center rounded-full px-2 py-3"}>
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
