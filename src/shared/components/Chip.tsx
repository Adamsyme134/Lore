import { View } from "react-native";
import { AppText } from "./AppText";
import { cx } from "../utils/cx";

type ChipProps = {
  label: string;
  tone?: "light" | "dark";
  className?: string;
};

export function difficultyPillClass(label: string) {
  if (label === "Easy") return "border-[#2D6A4F] bg-[#2D6A4F]";
  if (label === "Medium") return "border-accent bg-accent";
  if (label === "Challenging") return "border-[#B94A48] bg-[#B94A48]";
  return "";
}

export function difficultyPillTextClass(label: string) {
  if (label === "Easy" || label === "Challenging") return "text-ivory";
  if (label === "Medium") return "text-accentText";
  return "";
}

export function difficultyPillTextColor(label: string) {
  if (label === "Easy" || label === "Challenging") return "#F5F0E7";
  if (label === "Medium") return "#183431";
  return undefined;
}

export function Chip({ label, tone = "light", className }: ChipProps) {
  const difficultyClass = difficultyPillClass(label);
  const difficultyTextClass = difficultyPillTextClass(label);
  const difficultyTextColor = difficultyPillTextColor(label);

  return (
    <View className={cx("rounded-full border px-3 py-1.5", difficultyClass || (tone === "dark" ? "border-ivory/30 bg-charcoal/25" : "border-line bg-surface"), className)}>
      <AppText variant="caption" className={difficultyTextClass || (tone === "dark" ? "text-ivory" : "text-muted")} style={difficultyTextColor ? { color: difficultyTextColor } : undefined}>
        {label}
      </AppText>
    </View>
  );
}
