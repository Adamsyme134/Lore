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
  const {variables, setVariable, getVariable } = useQuestExecution();
  
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
const isWaiting = React.useMemo(() => {
    if (!normalizedConfig) return false;
    let varRef = "";
    
    if (normalizedConfig.source?.type === 'variable') {
      varRef = normalizedConfig.source.ref || "";
    } else if (normalizedConfig.source?.options?.[0]?.startsWith('$')) {
      varRef = normalizedConfig.source.options[0];
    } else if (normalizedConfig.options?.length === 1 && normalizedConfig.options[0].startsWith('$')) {
      varRef = normalizedConfig.options[0];
    }

    if (varRef) {
      const cleanRef = varRef.replace(/^\$/, '');
      const data = variables[cleanRef] || variables[varRef];
      return data === undefined || data === null || (Array.isArray(data) && data.length === 0);
    }
    
    return false;
  }, [normalizedConfig, variables]);
  // Fetch the data just-in-time when they click spin
  // Fetch the data just-in-time when they click spin
  const getOptions = (): string[] => {
    if (!normalizedConfig) return [];

    // Helper to strip '$' and safely resolve variable
    const resolveVariable = (ref: string) => {
      const varName = ref.replace(/^\$/, '');
      const variableData = getVariable(varName) || getVariable(ref);
      if (Array.isArray(variableData)) return variableData.map(String);
      if (typeof variableData === 'string') return [variableData]; 
      return null;
    };

    // Prioritize the new Source structure
    if (normalizedConfig.source) {
      // If it's technically marked static but the string starts with $, intercept it
      if (normalizedConfig.source.type === 'variable' || normalizedConfig.source.options?.[0]?.startsWith('$')) {
        const ref = normalizedConfig.source.ref || normalizedConfig.source.options?.[0] || '';
        if (!ref) return ["⚠️ Data not found"];
        return resolveVariable(ref) || ["⚠️ Data not found"];
      }
      
      if (normalizedConfig.source.type === 'static') {
        return normalizedConfig.source.options || [];
      }
    }

    // Fallback for legacy basic configs
    const opts = normalizedConfig.options || [];
    if (opts.length === 1 && opts[0].startsWith('$')) {
      return resolveVariable(opts[0]) || opts;
    }
    
    return opts;
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
        if (normalizedConfig.output?.isExposed && normalizedConfig.output.variableName) {
          const cleanVarName = normalizedConfig.output.variableName.replace(/^\$/, '');
          setVariable(cleanVarName, optionsToSpin[selectedIdx]);
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
        disabled={isWaiting || isSpinning} // ✨ 3. Disable the click
        className={`rounded-lg justify-center items-center px-4 shadow-sm ${
          isWaiting ? 'bg-stone opacity-50' : theme.bg // ✨ 4. Greyed out state
        }`}
        style={{ height: 36 }}
      >
        {/* Invisible text locks the width perfectly */}
        <AppText className="font-sansSemi text-[14px] opacity-0 h-0">{longestOption}</AppText>
        
        <View className="absolute inset-0 justify-center items-center">
          <AppText className={`font-sansSemi text-[14px] ${isWaiting ? 'text-ink/60' : 'text-white'}`}>
            {isWaiting ? "🔒 Locked" : displayText}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
}
