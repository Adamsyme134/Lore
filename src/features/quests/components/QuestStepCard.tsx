import { useState } from 'react';
import { View, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient'; // Ensure expo-linear-gradient is installed
import { AppText } from '../../../shared/components/AppText';
import { accentClass, type Accent } from '../../../shared/design/tokens';
import { Button } from '../../../shared/components/Button';
if (
  Platform.OS === 'android' && 
  UIManager.setLayoutAnimationEnabledExperimental && 
  !(globalThis as any)._IS_FABRIC_
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type QuestStepCardProps = {
  stepIndex: number;
  totalSteps: number;
  isActiveStep: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  isCompleteDisabled?: boolean;
  accent: Accent;
  onComplete: () => void;
  children: React.ReactNode;
};

export function QuestStepCard({ 
  stepIndex, 
  totalSteps,
  isActiveStep, 
  isCompleted, 
  isLocked, 
  isCompleteDisabled,
  accent,
  onComplete, 
  children 
}: QuestStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const EXPAND_THRESHOLD = 250; 

  const theme = accentClass[accent] || accentClass['orange'];
  const needsExpansion = !isExpanded && contentHeight >= EXPAND_THRESHOLD;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View 
      className={`rounded-card bg-white p-5 mb-4 shadow-sm border ${isActiveStep ? theme.border : 'border-line'} ${isLocked ? 'opacity-50' : 'opacity-100'}`}
      pointerEvents={isLocked ? 'none' : 'auto'}
    >
      {/* Step Header */}
      <View className="flex-row items-center mb-4">
        <View className={`h-8 w-8 items-center justify-center rounded-md border-2 ${isCompleted ? theme.bg + ' border-transparent' : 'border-line ' + theme.subtle}`}>
          {isCompleted ? (
            <AppText className="text-white text-xs font-bold">✓</AppText>
          ) : (
            <AppText variant="caption" className={theme.text}>{stepIndex + 1}</AppText>
          )}
        </View>
        <AppText variant="subtitle" className="ml-3 text-ink/80">
          Step {stepIndex + 1} of {totalSteps}
        </AppText>
      </View>

      {/* Content Wrapper */}
      <View style={{ maxHeight: isExpanded ? undefined : EXPAND_THRESHOLD, overflow: 'hidden' }}>
  <View onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}>
    {children}
  </View>
</View>

      {/* Show More Overlay */}
      {needsExpansion && (
        <View className="absolute bottom-[80px] left-0 right-0 h-24 justify-end items-center">
          <LinearGradient colors={['transparent', 'rgba(255,255,255,0.8)', 'rgba(255,255,255,1)']} className="absolute inset-0" />
          <Pressable onPress={toggleExpand} className="z-10 px-5 py-2 bg-stone rounded-full border border-line">
            <AppText className="font-sansSemi text-xs text-ink/70">Show full step ↓</AppText>
          </Pressable>
        </View>
      )}
        {/* Collapse Button */}
      {isExpanded && (
        <View className="mt-4 items-center">
          <Pressable onPress={toggleExpand} className="px-5 py-2 bg-stone rounded-full border border-line">
            <AppText className="font-sansSemi text-xs text-ink/70">Collapse step ↑</AppText>
          </Pressable>
        </View>
      )}
      {/* Action Button */}
      {isActiveStep && !needsExpansion && (
        <View className="mt-6 pt-4 border-t border-line/50">
          <Button label="Complete Step" onPress={onComplete} className={`w-full ${theme.bg}`} disabled={isCompleteDisabled} />
        </View>
      )}
    </View>
  );
}