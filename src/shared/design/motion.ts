import { Easing } from "react-native-reanimated";

export const motionDuration = {
  instant: 80,
  quick: 160,
  base: 240,
  slow: 420,
  reveal: 560
} as const;

export const motionEasing = {
  standard: Easing.out(Easing.cubic),
  emphasized: Easing.out(Easing.exp),
  soft: Easing.out(Easing.quad)
} as const;

export const motionSpring = {
  gentle: {
    damping: 18,
    stiffness: 160,
    mass: 1
  },
  snappy: {
    damping: 16,
    stiffness: 220,
    mass: 0.9
  }
} as const;

export const motionDelay = {
  none: 0,
  short: 80,
  medium: 160,
  long: 280
} as const;
