// src/features/quests/components/widgets/VariableDisplayWidget.tsx
import React from "react";
import { Text } from "react-native";
import { VariableDisplayConfig } from "../../../../shared/types/domain";
import { useQuestExecution } from "../../context/QuestExecutionContext";

type Props = {
  config: VariableDisplayConfig;
};

export function VariableDisplayWidget({ config }: Props) {
  const { getVariable } = useQuestExecution();
  
  // Read the variable from context
  const val = getVariable(config.variableName);
  
  // Format it for display
  const displayVal = val 
    ? (Array.isArray(val) ? val.join(', ') : String(val)) 
    : (config.fallbackText || "...");

  return (
    <Text className="font-sansSemi text-orange bg-orange/10 px-1 rounded-sm overflow-hidden">
      {displayVal}
    </Text>
  );
}