import React, { useState, useRef, useEffect } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { AppText } from '../../../../../src/shared/components/AppText';
import { useQuestExecution } from '../../context/QuestExecutionContext';

const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.substring(0, idx);
      const v = pair.substring(idx + 1);
      if (k) obj[k] = decodeURIComponent(v || '');
    }
  });
  return obj;
};

// --- 1. SHARED CARD UI ---
function Card({ entry, isRevealed, isCompleted, onReveal, onToggleComplete }: any) {
  const flipAnim = useRef(new Animated.Value(isRevealed ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: isRevealed ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isRevealed]);

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const bgColor = entry?.bgColor || '#F5F4F0'; 
  const textColor = entry?.bgColor && entry.bgColor !== '#FFFFFF' && entry.bgColor !== '#F5F4F0' ? '#FFFFFF' : '#1C1A17';
  const borderColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : 'rgba(28,26,23,0.3)';

  return (
    <Pressable 
      onPress={() => { if (!isRevealed) onReveal(); }}
      style={{ 
        width: '31.33%',
        aspectRatio: 5 / 7,
        margin: '1%',
        position: 'relative'
        // Removed the top-level perspective that was causing the TS error!
      }}
    >
      {/* FRONT (Hidden State) */}
      <Animated.View
        style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#1C1A17',
          borderRadius: 16,
          borderWidth: 1, borderColor: 'rgba(28,26,23,0.1)',
          alignItems: 'center', justifyContent: 'center',
          backfaceVisibility: 'hidden',
          // ✨ Put perspective back in the transform array where RN wants it
          transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }] 
        }}
      >
        <AppText className="text-white text-xs font-sansSemi text-center px-2">Tap to reveal</AppText>
      </Animated.View>

      {/* BACK (Revealed State) */}
      <Animated.View
        style={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: bgColor,
          borderRadius: 16,
          borderWidth: 1, borderColor: 'rgba(28,26,23,0.1)',
          overflow: 'hidden',
          backfaceVisibility: 'hidden',
          // ✨ Put perspective back in the transform array where RN wants it
          transform: [{ perspective: 1000 }, { rotateY: backInterpolate }]
        }}
      >
        {!!entry?.bgImage && <Image source={{ uri: entry.bgImage }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        
        <View className="flex-1 p-3 items-center justify-between z-10">
          <AppText 
            className="text-center text-[11px] font-sansSemi" 
            style={{ 
              color: textColor,
              textShadowColor: entry?.bgImage ? 'rgba(0,0,0,0.6)' : 'transparent',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2
            }} 
            numberOfLines={5}
          >
            {entry?.title || 'Unknown Challenge'}
          </AppText>
          <Pressable
            onPress={onToggleComplete}
            className={`w-7 h-7 rounded-full border-2 items-center justify-center ${isCompleted ? 'bg-green-500 border-green-500' : 'bg-transparent'}`}
            style={{ borderColor: isCompleted ? '#22c55e' : borderColor }}
          >
            {isCompleted && <AppText className="text-white text-xs">✓</AppText>}
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// --- 2. BUILDER PREVIEW (No Context Hook) ---
function CardRevealBuilder({ config }: any) {
  const cfg = parseConfig(config);
  const cardCount = parseInt(cfg.cardCount || '3', 10);
  let entries: any[] = [];
  try { entries = JSON.parse(cfg.entries || '[]'); } catch (e) {}

  const [builderRevealed, setBuilderRevealed] = useState<Record<number, boolean>>({});
  const [builderCompleted, setBuilderCompleted] = useState<Record<number, boolean>>({});
  const [builderAssigned, setBuilderAssigned] = useState<Record<number, any>>({});

  const cards = Array.from({ length: cardCount });

  const handleReveal = (index: number) => {
    const randomEntry = entries[Math.floor(Math.random() * entries.length)] || { title: 'No entries configured' };
    setBuilderAssigned(p => ({ ...p, [index]: randomEntry }));
    setBuilderRevealed(p => ({ ...p, [index]: true }));
  };

  const handleToggle = (index: number) => {
    setBuilderCompleted(p => ({ ...p, [index]: !p[index] }));
  };

  return (
    <View className="flex-row flex-wrap w-full my-4">
      {cards.map((_, i) => (
        <Card
          key={i}
          isRevealed={!!builderRevealed[i]}
          isCompleted={!!builderCompleted[i]}
          entry={builderAssigned[i]}
          onReveal={() => handleReveal(i)}
          onToggleComplete={() => handleToggle(i)}
        />
      ))}
    </View>
  );
}

// --- 3. ACTIVE QUEST UI (Uses Context Hook) ---
function CardRevealActive({ config, stepIndex, chunkIndex }: any) {
  
    const cfg = parseConfig(config);
  const cardCount = parseInt(cfg.cardCount || '3', 10);
  let entries: any[] = [];
  try { entries = JSON.parse(cfg.entries || '[]'); } catch (e) {}
    if (entries.length < cardCount) {
  throw new Error("Not enough entries for the number of cards.");
}
const shuffle = <T,>(array: T[]): T[] => {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};
  const { getVariable, setVariable } = useQuestExecution();
  const baseKey = `card_reveal_${stepIndex}_${chunkIndex}`;

  const cards = Array.from({ length: cardCount });
const initialiseAssignments = () => {
  if (getVariable(`${baseKey}_initialised`)) return;

  const shuffled = shuffle(entries);

  for (let i = 0; i < cardCount; i++) {
    setVariable(`${baseKey}_assigned_${i}`, shuffled[i]);
  }

  setVariable(`${baseKey}_initialised`, true);
};
  const handleReveal = (index: number) => {
  initialiseAssignments();
  setVariable(`${baseKey}_revealed_${index}`, true);
};

  const handleToggle = (index: number) => {
    const isComplete = getVariable(`${baseKey}_completed_${index}`);
    setVariable(`${baseKey}_completed_${index}`, !isComplete);
  };

  return (
    <View className="flex-row flex-wrap w-full my-4">
      {cards.map((_, i) => (
        <Card
          key={i}
          isRevealed={!!getVariable(`${baseKey}_revealed_${i}`)}
          isCompleted={!!getVariable(`${baseKey}_completed_${i}`)}
          entry={getVariable(`${baseKey}_assigned_${i}`)}
          onReveal={() => handleReveal(i)}
          onToggleComplete={() => handleToggle(i)}
        />
      ))}
    </View>
  );
}

// --- 4. EXPORTED WRAPPER ---
export function CardRevealWidget({ config, stepIndex, chunkIndex, isBuilder = false }: any) {
  // We completely bypass the context hook if we are in the builder!
  if (isBuilder) {
    return <CardRevealBuilder config={config} />;
  }
  return <CardRevealActive config={config} stepIndex={stepIndex} chunkIndex={chunkIndex} />;
}