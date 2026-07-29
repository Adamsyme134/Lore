import { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { AppText } from "../../../shared/components/AppText";
import { useThemeColors } from "../../../shared/design/useThemeColors";

type ExperienceProgressCardProps = {
  points: number;
  profileImageUrl?: string | null;
  profileInitial?: string;
  onProfilePress: () => void;
};

const LEVEL_XP_THRESHOLDS = [0, 250, 750, 1250, 2000, 3000, 4250, 5750, 7500, 9500];

function getLevelThreshold(level: number) {
  if (level <= LEVEL_XP_THRESHOLDS.length) {
    return LEVEL_XP_THRESHOLDS[level - 1];
  }

  let threshold = LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
  let nextIncrease = 2250;

  for (let nextLevel = LEVEL_XP_THRESHOLDS.length + 1; nextLevel <= level; nextLevel += 1) {
    threshold += nextIncrease;
    nextIncrease += 250;
  }

  return threshold;
}

function formatXp(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getExperienceProgress(points: number) {
  const safePoints = Math.max(0, points);
  let level = 1;

  while (safePoints >= getLevelThreshold(level + 1)) {
    level += 1;
  }

  const nextLevelXp = getLevelThreshold(level + 1);
  const xpToNextLevel = Math.max(0, nextLevelXp - safePoints);
  const progress = nextLevelXp === 0 ? 0 : Math.min(1, safePoints / nextLevelXp);

  return {
    level,
    nextLevel: level + 1,
    nextLevelXp,
    xpToNextLevel,
    progress
  };
}

export function ExperienceProgressCard({
  points,
  profileImageUrl,
  profileInitial = "A",
  onProfilePress
}: ExperienceProgressCardProps) {
  const colors = useThemeColors();
  const { level, nextLevel, nextLevelXp, xpToNextLevel, progress } = getExperienceProgress(points);
  const fillProgress = useSharedValue(0);
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    fillProgress.value = 0;
    glowProgress.value = 0;
    fillProgress.value = withDelay(
      180,
      withTiming(progress, {
        duration: 1100,
        easing: Easing.out(Easing.cubic)
      })
    );
    glowProgress.value = withDelay(
      480,
      withTiming(1, {
        duration: 760,
        easing: Easing.out(Easing.quad)
      })
    );
  }, [fillProgress, glowProgress, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0.015, fillProgress.value) * 100}%`
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + glowProgress.value * 0.75,
    backgroundColor: interpolateColor(glowProgress.value, [0, 1], ["#8D6A3B", "#F5D397"])
  }));

  return (
    <View style={styles.card}>
      <View style={styles.levelBlock}>
        <AppText style={[styles.levelLabel, { color: colors.textTertiary }]}>Level</AppText>
        <AppText style={[styles.levelValue, { color: colors.text }]}>{level}</AppText>
      </View>

      <View style={styles.meterBlock}>
        <View style={styles.meterLabels}>
          <AppText style={styles.currentXp}>
            {formatXp(points)} / {formatXp(nextLevelXp)} XP
          </AppText>
          <AppText style={[styles.remainingXp, { color: colors.textTertiary }]}>
            {formatXp(xpToNextLevel)} XP to level {nextLevel}
          </AppText>
        </View>

        <View style={[styles.track, { backgroundColor: colors.secondaryUi }]}>
          <Animated.View style={[styles.fill, fillStyle]}>
            <LinearGradient
              colors={["#F0C57E", "#FFE2A5", "#F3C878"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.fillGlow, glowStyle]} />
          </Animated.View>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.72}
        onPress={onProfilePress}
        style={[styles.profileButton, { backgroundColor: colors.background }]}
      >
        {profileImageUrl ? (
          <Image source={{ uri: profileImageUrl }} style={styles.profileImage} contentFit="cover" />
        ) : (
          <AppText style={styles.profileInitial}>{profileInitial}</AppText>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 178,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 16,
    gap: 2.5
  },
  levelBlock: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  levelLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 15
  },
  levelValue: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 4590,
    lineHeight: 474
  },
  meterBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 40
  },
  meterLabels: {
    minHeight: 18,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  currentXp: {
    flex: 1,
    color: "#D5AE70",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center"
  },
  remainingXp: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "right"
  },
  track: {
    height: 12,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.13)"
  },
  fill: {
    height: "100%",
    overflow: "hidden",
    borderRadius: 999,
    shadowColor: "#F5C97C",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 4
  },
  fillGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 18,
    borderRadius: 999
  },
  profileButton: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1.3,
    borderColor: "#C39A66",
    backgroundColor: "rgba(24,24,22,0.62)",
    shadowColor: "#C39A66",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 10,
    elevation: 5
  },
  profileImage: {
    height: "100%",
    width: "100%"
  },
  profileInitial: {
    color: "#F5D397",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 17,
    lineHeight: 22
  }
});
