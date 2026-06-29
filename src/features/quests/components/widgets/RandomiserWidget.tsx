// src/features/quests/components/widgets/RandomiserWidget.tsx
import React, { useState } from "react";
import { Pressable } from "react-native";
import { AppText } from "../../../../shared/components/AppText";
import { Accent, accentClass } from "../../../../shared/design/tokens";

type Props = {
  options: string[];
  accent: Accent;
};

export function RandomiserWidget({ options, accent }: Props) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);

  const theme = accentClass[accent] || accentClass["orange"];

  const startSpin = () => {
    if (isSpinning || !options || options.length === 0) return;
    setIsSpinning(true);
    
    let currentTick = 0;
    const totalTicks = 15; 
    let speed = 40; 

    const tick = () => {
      currentTick++;
      setDisplayIndex(Math.floor(Math.random() * options.length));

      if (currentTick < totalTicks) {
        if (currentTick > 10) speed += 30; // Suspense slowdown
        setTimeout(tick, speed);
      } else {
        setIsSpinning(false);
      }
    };

    setTimeout(tick, speed);
  };

  const displayText = displayIndex === null ? "🎲" : options[displayIndex];

  return (
    <Pressable 
      onPress={startSpin} 
      className={`h-[28px] justify-center px-3 mx-1 rounded-full border shadow-sm ${displayIndex === null ? 'bg-white border-line' : theme.bg + ' border-transparent'}`}
      style={{ transform: [{ translateY: -2 }] }} // Adjusts alignment so it sits perfectly inline with text
    >
      <AppText className={`${displayIndex === null ? 'text-ink/80' : 'text-white'} font-sansSemi`} style={{ fontSize: 14 }}>
        {displayText}
      </AppText>
    </Pressable>
  );
}