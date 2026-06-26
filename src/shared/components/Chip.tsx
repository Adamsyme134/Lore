import { View } from "react-native";
import { AppText } from "./AppText";
import { cx } from "../utils/cx";

type ChipProps = {
  label: string;
  tone?: "light" | "dark";
  className?: string;
};

export function Chip({ label, tone = "light", className }: ChipProps) {
  return (
    <View className={cx("rounded-full border px-3 py-1.5", tone === "dark" ? "border-ivory/30 bg-charcoal/25" : "border-line bg-cream", className)}>
      <AppText variant="caption" className={tone === "dark" ? "text-ivory" : "text-muted"}>
        {label}
      </AppText>
    </View>
  );
}
