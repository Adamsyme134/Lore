import { useState, useEffect } from 'react';
import { View, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  title?: string;
  isActiveStep: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  isCompleteDisabled?: boolean;
  accent: Accent;
  onComplete: () => void;
  children: React.ReactNode;
};

export function QuestStepCard({ 
  stepIndex, title, isActiveStep, isCompleted, isLocked, isCompleteDisabled, accent, onComplete, children 
}: QuestStepCardProps) {
  
  const [isExpanded, setIsExpanded] = useState(isActiveStep && !isCompleted);

  // AUTO EXPAND & COLLAPSE EFFECT
  useEffect(() => {
    if (isActiveStep && !isCompleted) {
      // Open the card when it becomes the active step
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(true);
    } else if (isCompleted) {
      // Collapse the card when it gets marked as completed
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(false);
    }
  }, [isActiveStep, isCompleted]);

  const theme = accentClass[accent] || accentClass['orange'];

  const toggleExpand = () => {
    if (isLocked) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const containerStyle = isActiveStep 
    ? `bg-surface rounded-[24px] p-5 shadow-sm border border-line mb-4`
    : `bg-transparent py-4 px-2 border-b border-line/30 mb-2`;

  return (
    <View className={`${containerStyle} ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
      
      {/* Header Row */}
      <Pressable onPress={toggleExpand} disabled={isLocked} className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className={`h-7 w-7 items-center justify-center rounded-full ${isCompleted ? 'bg-ink' : isActiveStep ? 'bg-ink' : 'border border-line bg-transparent'}`}>
            {isLocked ? (
               <Ionicons name="lock-closed-outline" size={12} color="var(--color-text)" style={{ opacity: 0.6 }} />
            ) : isCompleted ? (
              <AppText className="text-background text-xs font-bold">✓</AppText>
            ) : (
              <AppText className={`text-xs font-sansSemi ${isActiveStep ? 'text-background' : 'text-ink'}`}>{stepIndex + 1}</AppText>
            )}
          </View>
          
          <View className="ml-3 flex-1">
            <AppText variant="subtitle" className="text-ink text-base">
              {title || `Step ${stepIndex + 1}`}
            </AppText>
            {isLocked && (
              <AppText className="text-[10px] text-ink/50 mt-1 font-sans uppercase tracking-widest">
                Complete previous step to unlock
              </AppText>
            )}
          </View>
        </View>

        {!isLocked && (
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="var(--color-text)" style={{ opacity: 0.5 }} />
        )}
      </Pressable>

      {/* Expandable Content Body */}
      {isExpanded && !isLocked && (
        <View className="mt-4">
          {children}

          {isActiveStep && !isCompleted && (
            <View className="mt-5">
              <Button label="Next step" onPress={onComplete} className={`w-full ${theme.bg}`} disabled={isCompleteDisabled} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}