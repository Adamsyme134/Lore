import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";

type QuestHeroProps = {
  quest: Quest;
  className?: string;
  onPressOverride?: () => void;
  isSaved?: boolean;
  onSavePress?: () => void;
};

export function QuestHero({ quest, className, onPressOverride, isSaved, onSavePress }: QuestHeroProps) {
  const posMatch = quest.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPos = posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (quest.imagePosition || 'center');

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

        {/* IMAGE OVERLAY: Social Proof (Bottom Left) */}
        {quest.stats && quest.stats.completed > 0 && (
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
        {quest.locationHint && (
          <View className="absolute bottom-6 right-5 flex-row items-center">
            <Ionicons name="location-outline" size={12} color="white" />
            <AppText className="text-white text-[10px] ml-1">{quest.locationHint}</AppText>
          </View>
        )}
      </View>

      {/* Content Section below the image */}
      <View className="px-5 pt-6 pb-4 bg-background">
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          
          {/* TITLE & BOOKMARK ROW */}
          <View className="flex-row justify-between items-start mb-4">
            <AppText variant="display" className="text-ink dark:text-ivory text-3xl flex-1 mr-4">
              {quest.title}
            </AppText>
            
            {onSavePress && (
              <Pressable 
                onPress={onSavePress} 
                className={`w-11 h-11 rounded-full items-center justify-center border ${isSaved ? 'bg-ink border-ink' : 'bg-surface border-line'}`}
              >
                <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={20} color={isSaved ? "var(--color-background)" : "var(--color-text)"} />
              </Pressable>
            )}
          </View>
          
          <AppText className="text-ink/80 dark:text-ivory/80 text-[15px] leading-relaxed mb-6">
            {quest.description}
          </AppText>

          {/* The 4 Set Info Sections */}
          <View className="flex-row justify-between items-start py-4 border-t border-b border-line mb-6">
            <View className="flex-1 items-center border-r border-line/50">
              <Ionicons name="time-outline" size={18} color="var(--color-text)" />
              <AppText className="text-[9px] font-sansSemi mt-2 text-ink/50 dark:text-ivory/50 uppercase tracking-widest">Time</AppText>
              <AppText className="text-xs text-ink dark:text-ivory mt-1 font-sans text-center">{quest.length || '2-3 hrs'}</AppText>
            </View>
            <View className="flex-1 items-center border-r border-line/50">
              <Ionicons name="stats-chart-outline" size={18} color="var(--color-text)" />
              <AppText className="text-[9px] font-sansSemi mt-2 text-ink/50 dark:text-ivory/50 uppercase tracking-widest">Difficulty</AppText>
              <AppText className="text-xs text-ink dark:text-ivory mt-1 font-sans text-center">{quest.difficulty || 'Easy'}</AppText>
            </View>
            <View className="flex-1 items-center border-r border-line/50 px-1">
              <Ionicons name="location-outline" size={18} color="var(--color-text)" />
              <AppText className="text-[9px] font-sansSemi mt-2 text-ink/50 dark:text-ivory/50 uppercase tracking-widest">Location</AppText>
              <AppText className="text-xs text-ink dark:text-ivory mt-1 font-sans text-center truncate" numberOfLines={1}>{quest.locationHint || 'Anywhere'}</AppText>
            </View>
            <View className="flex-1 items-center">
              <Ionicons name="cash-outline" size={18} color="var(--color-text)" />
              <AppText className="text-[9px] font-sansSemi mt-2 text-ink/50 dark:text-ivory/50 uppercase tracking-widest">Cost</AppText>
              <AppText className="text-xs text-ink dark:text-ivory mt-1 font-sans text-center">{quest.cost || '£-££'}</AppText>
            </View>
          </View>

          {/* Why this quest */}
          <View className="mb-4">
            <AppText className="text-[10px] font-sansSemi text-ink/50 dark:text-ivory/50 uppercase tracking-widest mb-2">
              Why this quest?
            </AppText>
            <AppText className="text-ink/80 dark:text-ivory/80 text-sm leading-relaxed">
              {quest.whyItMatters || quest.description}
            </AppText>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}