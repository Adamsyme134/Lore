// src/features/quests/components/widgets/RandomiserWidget.tsx
import React, { useState } from "react";
import { Pressable } from "react-native";
import { AppText } from "../../../../shared/components/AppText";
import { Accent, accentClass } from "../../../../shared/design/tokens";
import { RandomiserConfig } from "../../../../shared/types/domain";
import { useQuestExecution } from "../../context/QuestExecutionContext";
import { View } from "react-native";
type Props = {
  config: RandomiserConfig;
  accent: Accent;
};
const parseQueryConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) obj[k] = decodeURIComponent(v || '');
  });
  return obj;
};

export function RandomiserWidget({ config, accent }: Props) {
  const { setVariable, getVariable } = useQuestExecution();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);

  const theme = accentClass[accent] || accentClass["orange"];
// Self-heal the config if the frontend parser passed the raw URL string by accident
  // Self-heal the config if the frontend parser passed the raw URL string by accident
  const normalizedConfig = React.useMemo(() => {
    let rawString = "";
    
    // Aggressively hunt for the string no matter how the frontend parser shaped the object
    const possibleFields = [
      config,
      (config as any)?.options,
      (config as any)?.options?.[0],
      (config as any)?.source?.options,
      (config as any)?.source?.options?.[0],
      (config as any)?.config
    ];

    for (const field of possibleFields) {
      if (typeof field === 'string' && field.includes('=')) {
        rawString = field;
        break;
      }
    }
    
    if (rawString) {
      const parsed = parseQueryConfig(rawString);
      return {
        options: parsed.options ? parsed.options.split(',').map(s => s.trim()) : [],
        output: {
          isExposed: parsed.isExposed === 'true',
          variableName: parsed.variableName || ''
        },
        source: {
          type: (parsed.type as 'static' | 'variable') || 'static',
          options: parsed.options ? parsed.options.split(',').map(s => s.trim()) : [],
          ref: parsed.ref
        }
      } as RandomiserConfig;
    }
    return config;
  }, [config]);

  // Fetch the data just-in-time when they click spin
  const getOptions = (): string[] => {
    if (!normalizedConfig) return [];

    // Prioritize the new Source structure
    if (normalizedConfig.source) {
      if (normalizedConfig.source.type === 'static') {
        return normalizedConfig.source.options || [];
      }
      if (normalizedConfig.source.type === 'variable') {
        if (!normalizedConfig.source.ref) return ["⚠️ Data not found"];
        const variableData = getVariable(normalizedConfig.source.ref);
        if (Array.isArray(variableData)) return variableData.map(String);
        if (typeof variableData === 'string') return [variableData]; 
        return ["⚠️ Data not found"];
      }
    }

    // Fallback for legacy basic configs
    if (normalizedConfig.options) return normalizedConfig.options;
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
    ? "🎲 Spin" 
    : (currentOptions[displayIndex] || "🎲 Spin");

  // Calculate the longest option dynamically so the width stays locked while spinning
  const optionsForWidth = getOptions();
  const longestOption = optionsForWidth.length > 0 
    ? optionsForWidth.reduce((a, b) => a.length > b.length ? a : b, "🎲 Spin") 
    : "🎲 Spin";

  return (
    <View style={{ transform: [{ translateY: 3 }], marginHorizontal: 3 }}>
      <Pressable
        onPress={startSpin}
        className={`rounded-lg justify-center items-center px-4 shadow-sm ${theme.bg}`}
        style={{ height: 36 }}
      >
        {/* Invisible text locks the width perfectly */}
        <AppText className="font-sansSemi text-[14px] opacity-0 h-0">{longestOption}</AppText>
        
        <View className="absolute inset-0 justify-center items-center">
          <AppText className="text-white font-sansSemi text-[14px]">
            {displayText}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}