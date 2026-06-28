// app/(app)/group/select.tsx
import { View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Screen } from "../../../src/shared/components/Screen";
import { TopBar } from "../../../src/shared/components/TopBar";
import { AppText } from "../../../src/shared/components/AppText";
import { Button } from "../../../src/shared/components/Button";

export default function GroupSelectScreen() {
  const { questId } = useLocalSearchParams();
  
  return (
    <Screen>
      <TopBar showBack title="Group Quest" />
      <View className="px-6 pt-6 flex-1">
        <AppText variant="display" className="mb-4 text-ink">Who is joining you?</AppText>
        <AppText variant="body" className="text-ink/70 mb-8">
          Select an existing friend group to challenge, or create a new crew for this adventure.
        </AppText>
        
        <View className="flex-1 border border-line bg-white rounded-[32px] p-6 justify-center items-center mb-8">
          <AppText variant="subtitle" className="text-ink/50 text-center">
            No groups created yet.
          </AppText>
        </View>

        <Button label="Create New Group" onPress={() => alert("Group creation coming soon!")} className="mb-4 bg-orange" />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}