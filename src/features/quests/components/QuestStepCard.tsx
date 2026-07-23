import { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { Check, ChevronDown, Lock } from 'lucide-react-native';
import { AppText } from '../../../shared/components/AppText';
import { accentClass, type Accent } from '../../../shared/design/tokens';
import { cx } from '../../../shared/utils/cx';



type QuestStepCardProps = {
  stepIndex: number;
  totalSteps: number;
  title?: string;
  isActiveStep: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  isExpanded: boolean;
  isCompleteDisabled?: boolean;
  accent: Accent;
  onToggleExpanded: () => void;
  onComplete: () => void;
  children: React.ReactNode;
};

export function QuestStepCard({ 
  stepIndex, title, isActiveStep, isCompleted, isLocked, isExpanded, isCompleteDisabled, accent, onToggleExpanded, onComplete, children 
}: QuestStepCardProps) {
  const chevronRotation = useSharedValue(isExpanded ? 180 : 0);

  useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 180 : 0, { duration: 180 });
  }, [chevronRotation, isExpanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }]
  }));

  const theme = accentClass[accent] || accentClass['orange'];

  const toggleExpand = () => {
    if (isLocked) return;
    onToggleExpanded();
  };

  const containerStyle = isActiveStep 
    ? `bg-surface rounded-[18px] px-4 py-4 border border-line mb-3`
    : `bg-background rounded-[18px] px-4 py-4 border border-line/60 mb-3 shadow-none`;

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      className={containerStyle}
    >
      
      {/* Header Row */}
      <Pressable onPress={toggleExpand} disabled={isLocked} className="min-h-[44px] flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <View className={`h-8 w-8 items-center justify-center rounded-full ${isCompleted ? 'bg-ink' : isActiveStep ? 'border border-ink bg-transparent' : 'border border-line bg-transparent'}`}>
            {isLocked ? (
              <Lock size={13} color="rgba(23, 22, 18, 0.55)" strokeWidth={2.4} />
            ) : isCompleted ? (
              <Check size={15} color="#F5F0E7" strokeWidth={3} />
            ) : isActiveStep ? (
              <View className="h-2.5 w-2.5 rounded-full bg-ink" />
            ) : (
              <AppText className="text-xs font-sansSemi text-ink">{stepIndex + 1}</AppText>
            )}
          </View>
          
          <View className="ml-4 flex-1 justify-center">
            <AppText className={cx("text-[14px] leading-5", isLocked ? "font-sans text-ink/45" : "font-sansSemi text-ink")}>
              {title}
            </AppText>
            {isLocked && (
              <AppText className="mt-1 text-[9px] font-sans uppercase tracking-widest text-ink/40">
                Complete previous step to unlock
              </AppText>
            )}
          </View>
        </View>

        {!isLocked && (
          <Animated.View style={chevronStyle} className="ml-3">
            <ChevronDown size={18} color="rgba(23, 22, 18, 0.5)" strokeWidth={2.2} />
          </Animated.View>
        )}
      </Pressable>

      {/* Expandable Content Body */}
      {isExpanded && !isLocked && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={LinearTransition.duration(220)}
          className="mt-4"
        >
          {children}

          {isActiveStep && !isCompleted && (
            <View className="mt-5">
              <Pressable
                onPress={onComplete}
                disabled={isCompleteDisabled}
                className={cx("min-h-[56px] items-center justify-center rounded-full px-6 py-4", theme.bg, isCompleteDisabled && "opacity-50")}
              >
                <AppText variant="caption" className="font-sansBold uppercase tracking-editorial text-ivory">
                  Next step
                </AppText>
              </Pressable>
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}
