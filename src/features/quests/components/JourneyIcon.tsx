import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { StyleProp, TextStyle } from "react-native";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

type JourneyIconProps = {
  name?: string | null;
  size: number;
  color: string;
  style?: StyleProp<TextStyle>;
};

export function JourneyIcon({ name, size, color, style }: JourneyIconProps) {
  const safeName = name || "trail-sign-outline";
  const common = {
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none"
  };

  if (safeName === "trail-sign-outline") {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="m15.8 6.8-3 10.4-4.6-1.9 3-10.4 4.6 1.9Z" {...common} />
      </Svg>
    );
  }

  if (safeName.startsWith("lore:")) {
    const iconName = safeName.replace("lore:", "");

    if (iconName === "mountain") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 19 9.4 7.5 14 15l2-3 5 7H3Z" {...common} />
          <Path d="m9.4 7.5 2.2 3.6 1.8-1.7" {...common} />
        </Svg>
      );
    }

    if (iconName === "summit") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 19 11 5l7 14H4Z" {...common} />
          <Path d="M11 5v14" {...common} />
          <Path d="M11 8h5l-1.4 2L16 12h-5" {...common} />
        </Svg>
      );
    }

    if (iconName === "forest") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7 19v-4" {...common} />
          <Path d="M17 19v-5" {...common} />
          <Path d="M3.5 15 7 5l3.5 10h-7Z" {...common} />
          <Path d="M13 14 17 3l4 11h-8Z" {...common} />
        </Svg>
      );
    }

    if (iconName === "campfire") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 15c-2-1.8-1.4-4 .8-6.4.4 2.2 2.4 3.3 2.4 5.3A3.2 3.2 0 0 1 12 17a3.2 3.2 0 0 1-3.2-3.1c0-1.4.8-2.6 2-3.8-.2 2 .5 3.5 1.2 4.9Z" {...common} />
          <Path d="m5 20 14-5" {...common} />
          <Path d="m19 20-14-5" {...common} />
        </Svg>
      );
    }

    if (iconName === "waves") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 9c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2S18.4 9 21 9" {...common} />
          <Path d="M3 14c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2S18.4 14 21 14" {...common} />
          <Path d="M3 19c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2S18.4 19 21 19" {...common} />
        </Svg>
      );
    }

    if (iconName === "cave") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 20V9.5C3 5.8 6.2 3 10 3h4c3.8 0 7 2.8 7 6.5V20" {...common} />
          <Path d="M8 20v-7a4 4 0 0 1 8 0v7" {...common} />
          <Path d="M5 20h14" {...common} />
        </Svg>
      );
    }

    if (iconName === "compass-star") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="m14.8 9.2-1.7 3.9-3.9 1.7 1.7-3.9 3.9-1.7Z" {...common} />
          <Line x1="12" y1="2" x2="12" y2="4" {...common} />
          <Line x1="12" y1="20" x2="12" y2="22" {...common} />
        </Svg>
      );
    }

    if (iconName === "diver") {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="9" cy="8" r="2.5" {...common} />
          <Path d="M11 10.5 15 14l4-1" {...common} />
          <Path d="m13 12-4 5" {...common} />
          <Path d="m7 18 4-1" {...common} />
          <Path d="M3 20c2 0 2-1.4 4-1.4s2 1.4 4 1.4 2-1.4 4-1.4S17 20 21 20" {...common} />
        </Svg>
      );
    }
  }

  if (safeName.startsWith("mci:")) {
    return <MaterialCommunityIcons name={safeName.replace("mci:", "") as any} size={size} color={color} style={style} />;
  }

  return <Ionicons name={safeName as any} size={size} color={color} style={style} />;
}
