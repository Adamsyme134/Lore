import { View } from "react-native";
import { AppText } from "../../../shared/components/AppText";

type PointsPillProps = {
  points: number;
  label?: string;
};

export function PointsPill({ points, label = "Lore Points" }: PointsPillProps) {
  return (
    <View className="rounded-full border border-line bg-cream px-4 py-2">
      <AppText variant="caption" className="font-sansSemi text-ink">
        {points} {label}
      </AppText>
    </View>
  );
}
