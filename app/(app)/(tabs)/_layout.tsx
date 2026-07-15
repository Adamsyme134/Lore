import { Tabs } from "expo-router";
import { LoreTabBar } from "../../../src/shared/components/LoreTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <LoreTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="archive" options={{ title: "Lore" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="friends" options={{ title: "People" }} />
    </Tabs>
  );
}
