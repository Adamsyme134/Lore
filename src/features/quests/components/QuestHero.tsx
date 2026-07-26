import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { useThemeColors } from "../../../shared/design/useThemeColors";

type QuestHeroProps = {
  quest: Quest;
  className?: string;
  variant?: "full" | "recommended";
  onPressOverride?: () => void;
  isSaved?: boolean;
  isCompleted?: boolean;
  onSavePress?: () => void;
};

const stampScratches = [
  { x: 70, y: 94, width: 58, height: 5, rotate: -4 },
  { x: 142, y: 99, width: 24, height: 4, rotate: 6 },
  { x: 198, y: 88, width: 66, height: 5, rotate: -7 },
  { x: 286, y: 103, width: 46, height: 4, rotate: 3 },
  { x: 386, y: 91, width: 72, height: 5, rotate: 6 },
  { x: 492, y: 102, width: 38, height: 4, rotate: -5 },
  { x: 570, y: 92, width: 92, height: 5, rotate: 4 },
  { x: 706, y: 103, width: 54, height: 4, rotate: -6 },
  { x: 804, y: 89, width: 76, height: 5, rotate: 5 },
  { x: 94, y: 131, width: 30, height: 7, rotate: -15 },
  { x: 156, y: 174, width: 52, height: 8, rotate: 10 },
  { x: 246, y: 203, width: 28, height: 7, rotate: -8 },
  { x: 322, y: 158, width: 64, height: 8, rotate: 11 },
  { x: 424, y: 217, width: 44, height: 7, rotate: -13 },
  { x: 512, y: 144, width: 58, height: 8, rotate: 9 },
  { x: 596, y: 190, width: 26, height: 7, rotate: -10 },
  { x: 690, y: 154, width: 74, height: 8, rotate: 7 },
  { x: 780, y: 214, width: 48, height: 7, rotate: -9 },
  { x: 864, y: 166, width: 28, height: 7, rotate: 12 },
  { x: 92, y: 252, width: 72, height: 5, rotate: 3 },
  { x: 210, y: 239, width: 54, height: 4, rotate: -6 },
  { x: 318, y: 257, width: 86, height: 5, rotate: 5 },
  { x: 464, y: 241, width: 40, height: 4, rotate: -7 },
  { x: 560, y: 254, width: 62, height: 5, rotate: 4 },
  { x: 682, y: 238, width: 46, height: 4, rotate: -5 },
  { x: 774, y: 256, width: 84, height: 5, rotate: 6 }
];

function CompletedStamp() {
  return (
    <Svg pointerEvents="none" className="absolute inset-0 z-20" viewBox="0 0 1000 350" preserveAspectRatio="none">
      <G transform="rotate(-8 500 175)" opacity={0.94}>
        <Line x1="58" y1="88" x2="942" y2="88" stroke="white" strokeWidth="18" strokeLinecap="square" />
        <Line x1="66" y1="262" x2="934" y2="262" stroke="white" strokeWidth="22" strokeLinecap="square" />
        <SvgText
          x="500"
          y="222"
          fill="white"
          fontSize="138"
          fontWeight="900"
          fontFamily="Inter_900Black, Inter_800ExtraBold, Inter_700Bold, System"
          letterSpacing="-2"
          textAnchor="middle"
        >
          COMPLETED
        </SvgText>
        {stampScratches.map((scratch, index) => (
          <Rect
            key={index}
            x={scratch.x}
            y={scratch.y}
            width={scratch.width}
            height={scratch.height}
            fill="#1c1a17"
            fillOpacity={0.68}
            transform={`rotate(${scratch.rotate} ${scratch.x + scratch.width / 2} ${scratch.y + scratch.height / 2})`}
          />
        ))}
      </G>
    </Svg>
  );
}

export function QuestHero({ quest, className, variant = "full", onPressOverride, isSaved, isCompleted, onSavePress }: QuestHeroProps) {
  const colors = useThemeColors();
  const posMatch = quest.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPos = posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (quest.imagePosition || 'center');
  const isRecommended = variant === "recommended";

  const handlePress = () => {
    if (onPressOverride) {
      onPressOverride();
    } else {
      router.push({ pathname: "/quest/[id]", params: { id: quest.id } });
    }
  };

  return (
    <Pressable onPress={handlePress} className={`bg-background ${className || ''}`}>
      {/* Edge-to-edge Hero Image */}
      <View className="h-[350px] w-full relative">
        <Image
          source={{ uri: quest.imageUrl }}
          transition={400}
          contentFit="cover"
          contentPosition={contentPos as any}
          style={{ height: "100%", width: "100%" }}
        />
        <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        {isCompleted && !isRecommended ? <CompletedStamp /> : null}

        {isRecommended ? (
          <>
            <LinearGradient
              colors={["transparent", "rgba(0, 0, 0, 0.88)"]}
              locations={[0, 1]}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 192
              }}
            />
            <View className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-16">
              <AppText variant="display" className="text-ivory text-4xl leading-[46px]">
                {quest.title}
              </AppText>
            </View>
          </>
        ) : null}

        {/* IMAGE OVERLAY: Social Proof (Bottom Left) */}
        {!isRecommended && quest.stats && quest.stats.completed > 0 && (
          <View className="absolute bottom-5 left-5 flex-row items-center">
            {quest.stats.recentAvatars && quest.stats.recentAvatars.length > 0 && (
              <View className="flex-row">
                {quest.stats.recentAvatars.slice(0, 3).map((avatar, i) => (
                  <Image 
                    key={i} 
                    source={{ uri: avatar }} 
                    className={`w-7 h-7 rounded-full border-2 border-[#1c1a17] ${i > 0 ? '-ml-2' : ''}`} 
                  />
                ))}
              </View>
            )}
            <View className={quest.stats.recentAvatars?.length ? "ml-2" : ""}>
              <AppText className="text-white text-[11px] font-sansSemi">
                {quest.stats.completed >= 1000 
                  ? `${(quest.stats.completed / 1000).toFixed(1)}K` 
                  : quest.stats.completed}
              </AppText>
              <AppText className="text-white/80 text-[9px] font-sans">have completed</AppText>
            </View>
          </View>
        )}

        {/* IMAGE OVERLAY: Location (Bottom Right) */}
        {!isRecommended && quest.locationHint && (
          <View className="absolute bottom-6 right-5 flex-row items-center">
            <Ionicons name="location-outline" size={12} color="white" />
            <AppText className="text-white text-[10px] ml-1">{quest.locationHint}</AppText>
          </View>
        )}
      </View>

      {/* Content Section below the image */}
      <View className={`${isRecommended ? "px-0 py-0" : "px-2 pt-6 pb-4"} bg-background`}>
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          
          {!isRecommended && (
            <>
              {/* TITLE & BOOKMARK ROW */}
              <View className="flex-row justify-between items-start mb-5">
                <AppText variant="display" className="text-3xl leading-[42px] flex-1 mr-4">
                  {quest.title}
                </AppText>
                
                {onSavePress && !isCompleted && (
                  <Pressable 
                    onPress={onSavePress} 
                    className={`w-11 h-11 rounded-full items-center justify-center border ${isSaved ? 'bg-accent border-accent' : 'bg-surface border-line'}`}
                  >
                    <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? colors.accentText : colors.text} />
                  </Pressable>
                )}
              </View>
              
              <AppText className="text-[15px] leading-6 mb-6">
                {quest.description}
              </AppText>
            </>
          )}

          {/* The 4 Set Info Sections */}
          <View className={`flex-row justify-between items-start py-4 border-t border-b border-line ${isRecommended ? "" : "mb-6"}`}>
            <View className="flex-1 items-center border-r border-line/50">
              <Ionicons name="time-outline" size={18} color={colors.text} />
              <AppText className="text-[9px] font-sansSemi mt-2 text-tertiary uppercase tracking-widest">Time</AppText>
              <AppText className="text-xs text-ink mt-1 font-sans text-center">{quest.length || '2-3 hrs'}</AppText>
            </View>
            <View className="flex-1 items-center border-r border-line/50">
              <Ionicons name="stats-chart-outline" size={18} color={colors.text} />
              <AppText className="text-[9px] font-sansSemi mt-2 text-tertiary uppercase tracking-widest">Difficulty</AppText>
              <AppText className="text-xs text-ink mt-1 font-sans text-center">{quest.difficulty || 'Easy'}</AppText>
            </View>
            <View className="flex-1 items-center border-r border-line/50 px-1">
              <Ionicons name="location-outline" size={18} color={colors.text} />
              <AppText className="text-[9px] font-sansSemi mt-2 text-tertiary uppercase tracking-widest">Location</AppText>
              <AppText className="text-xs text-ink mt-1 font-sans text-center truncate" numberOfLines={1}>{quest.locationHint || 'Anywhere'}</AppText>
            </View>
            <View className="flex-1 items-center">
              <Ionicons name="cash-outline" size={18} color={colors.text} />
              <AppText className="text-[9px] font-sansSemi mt-2 text-tertiary uppercase tracking-widest">Cost</AppText>
              <AppText className="text-xs text-ink mt-1 font-sans text-center">{quest.cost || '£-££'}</AppText>
            </View>
          </View>

          {!isRecommended && (
            <View className="mb-4">
              <AppText className="text-[10px] font-sansSemi text-tertiary uppercase tracking-widest mb-2">
                Why this quest?
              </AppText>
              <AppText className="text-sm leading-relaxed">
                {quest.whyItMatters || quest.description}
              </AppText>
            </View>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}
