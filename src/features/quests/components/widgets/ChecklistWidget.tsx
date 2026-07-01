// src/features/quests/components/widgets/ChecklistWidget.tsx
import { View, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { AppText } from '../../../../shared/components/AppText';
import { useQuestExecution } from '../../context/QuestExecutionContext';
import { Ionicons } from '@expo/vector-icons';

export function ChecklistWidget({ config, stepIndex }: { config: string, stepIndex: number }) {
  const { setVariable, getVariable } = useQuestExecution();
  const rawItemsString = config.startsWith('items=') ? decodeURIComponent(config.replace('items=', '')) : config;
  const items = rawItemsString.split(',').map(s => s.trim()).filter(Boolean);
  const stateKey = `step_${stepIndex}_checklist_state`;
  const completedKey = `step_${stepIndex}_checklist_completed`;
  
  // Load local checked state from global context, or initialize empty
  const [checked, setChecked] = useState<boolean[]>(
    getVariable(stateKey) || new Array(items.length).fill(false)
  );

  useEffect(() => {
    const allDone = checked.length > 0 && checked.every(Boolean);
    setVariable(stateKey, checked);
    setVariable(completedKey, allDone);
  }, [checked]);

  const toggle = (i: number) => {
    const n = [...checked];
    n[i] = !n[i];
    setChecked(n);
  };

  return (
    <View className="my-2 w-full">
      {items.map((item, i) => (
        <Pressable key={i} onPress={() => toggle(i)} className="flex-row items-center py-2">
          <View className={`w-6 h-6 rounded-md border items-center justify-center mr-3 ${checked[i] ? 'bg-ink border-ink' : 'border-line bg-white'}`}>
            {checked[i] && <Ionicons name="checkmark" size={16} color="white" />}
          </View>
          <AppText className={`text-base ${checked[i] ? 'text-ink/40 line-through' : 'text-ink'}`}>
            {item}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}