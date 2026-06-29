// src/features/quests/components/widgets/RandomiserWidget.tsx
import React, { useState } from "react";
import { Pressable } from "react-native";
import { AppText } from "../../../../shared/components/AppText";
import { Accent, accentClass } from "../../../../shared/design/tokens";
import { RandomiserConfig } from "../../../../shared/types/domain";
import { useQuestExecution } from "../../context/QuestExecutionContext";

type Props = {
  config: RandomiserConfig;
  accent: Accent;
};

export function RandomiserWidget({ config, accent }: Props) {
  const { setVariable, getVariable } = useQuestExecution();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  const theme = accentClass[accent] || accentClass["orange"];

  // Fetch the data just-in-time when they click spin
  const getOptions = (): string[] => {
    if (!config?.source) return [];

    if (config.source.type === 'static') {
      return config.source.options || [];
    }

    if (config.source.type === 'variable') {
      const variableData = getVariable(config.source.ref);
      
      // Ensure the variable we pulled is actually an array
      if (Array.isArray(variableData)) {
        return variableData.map(String);
      }
      if (typeof variableData === 'string') {
          return [variableData]; // Fallback if it's a single string
      }
      return ["⚠️ Data not found"];
    }

    return [];
  };

  const startSpin = () => {
    if (isSpinning) return;
    
    const optionsToSpin = getOptions();
    if (!optionsToSpin || optionsToSpin.length === 0) return;

    setCurrentOptions(optionsToSpin);
    setIsSpinning(true);
    
    let currentTick = 0;
    const totalTicks = 15; 
    let speed = 40; 

    const tick = () => {
      currentTick++;
      const selectedIdx = Math.floor(Math.random() * optionsToSpin.length);
      setDisplayIndex(selectedIdx);

      if (currentTick < totalTicks) {
        if (currentTick > 10) speed += 30;
        setTimeout(tick, speed);
      } else {
        setIsSpinning(false);
        // ✨ EXPOSE THE OUTPUT TO GLOBAL CONTEXT ✨
        if (config.output?.isExposed && config.output.variableName) {
          setVariable(config.output.variableName, optionsToSpin[selectedIdx]);
        }
      }
    };

    setTimeout(tick, speed);
  };

  const displayText = displayIndex === null 
    ? "🎲" 
    : (currentOptions[displayIndex] || "🎲");

  return (
    <Pressable 
      onPress={startSpin} 
      className={`h-[28px] justify-center px-3 mx-1 rounded-full border shadow-sm ${displayIndex === null ? 'bg-white border-line' : theme.bg + ' border-transparent'}`}
      style={{ transform: [{ translateY: -2 }] }}
    >
      <AppText className={`${displayIndex === null ? 'text-ink/80' : 'text-white'} font-sansSemi text-[14px]`}>
        {displayText}
      </AppText>
    </Pressable>
  );
}