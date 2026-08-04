import type { ComponentProps } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { QuestCategory, QuestDifficulty, QuestLength } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { cx } from "../../../shared/utils/cx";
import { difficultyPillClass, difficultyPillTextClass, difficultyPillTextColor } from "../../../shared/components/Chip";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const categoryIcons: Record<QuestCategory, IoniconName> = {
  Adventure: "trail-sign-outline",
  Skill: "construct-outline",
  Culture: "library-outline",
  "Food & Drink": "restaurant-outline",
  Fitness: "leaf-outline",
  Social: "people-outline"
};

function getCategoryIcon(category?: QuestCategory | null): IoniconName {
  return category ? categoryIcons[category] : "compass-outline";
}

type CategoryIconBadgeProps = {
  category?: QuestCategory | null;
  className?: string;
  size?: "sm" | "md";
  tone?: "overlay" | "surface";
};

export function CategoryIconBadge({ category, className, size = "md", tone = "overlay" }: CategoryIconBadgeProps) {
  const iconSize = size === "sm" ? 17 : 20;

  return (
    <View
      className={cx(
        "items-center justify-center rounded-full border",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        tone === "overlay" ? "border-ivory/25 bg-background/70" : "border-line bg-surface",
        className
      )}
    >
      <Ionicons name={getCategoryIcon(category)} size={iconSize} color={tone === "overlay" ? "#F3F0EB" : "#183431"} />
    </View>
  );
}

type QuestMetaPillsProps = {
  length?: QuestLength | string | null;
  difficulty?: QuestDifficulty | string | null;
  tone?: "overlay" | "surface";
  className?: string;
  compact?: boolean;
};

export function QuestMetaPills({ length, difficulty, tone = "overlay", className, compact = false }: QuestMetaPillsProps) {
  const textSizeClass = compact ? "text-[7px]" : "text-[8px]";
  const iconSize = compact ? 8 : 9;
  const fallbackPillClass = tone === "overlay" ? "border-ivory/20 bg-ivory/15" : "border-line bg-surface";
  const fallbackTextClass = tone === "overlay" ? "text-ivory" : "text-muted";
  const clockColor = tone === "overlay" ? "#F3F0EB" : "#787267";

  return (
    <View className={cx("flex-row flex-wrap items-center gap-2", className)}>
      {length ? (
        <View className={cx("flex-row items-center rounded-full border px-2 py-1", fallbackPillClass)}>
          <Ionicons name="time-outline" size={iconSize} color={clockColor} />
          <AppText className={cx("ml-1 font-sansSemi", textSizeClass, fallbackTextClass)} numberOfLines={1}>
            {length}
          </AppText>
        </View>
      ) : null}
      {difficulty ? (
        <View className={cx("rounded-full border px-2 py-1", difficultyPillClass(difficulty) || fallbackPillClass)}>
          <AppText
            className={cx("font-sansSemi", textSizeClass, difficultyPillTextClass(difficulty) || fallbackTextClass)}
            style={difficultyPillTextColor(difficulty) ? { color: difficultyPillTextColor(difficulty) } : undefined}
            numberOfLines={1}
          >
            {difficulty}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
