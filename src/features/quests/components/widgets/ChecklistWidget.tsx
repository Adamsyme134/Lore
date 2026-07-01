// src/features/quests/components/widgets/ChecklistWidget.tsx
import { View, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { AppText } from '../../../../shared/components/AppText';
import { useQuestExecution } from '../../context/QuestExecutionContext';
import { Ionicons } from '@expo/vector-icons';

// Helper to parse config strings like "items=A,B&isRequired=true"
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

export function ChecklistWidget({ config, stepIndex }: { config: string, stepIndex: number }) {
  const { setVariable, getVariable } = useQuestExecution();
  
  // Parse the configuration safely handling legacy formats
  const isLegacy = !config.includes('=');
  const currentCfg = isLegacy ? { items: config } : parseConfig(config);
  
  const rawItemsString = currentCfg.items !== undefined ? currentCfg.items : config.replace('items=', '');
  const items = decodeURIComponent(rawItemsString).split(',').map(s => s.trim()).filter(Boolean);
  const isRequired = currentCfg.isRequired === 'true';

  const stateKey = `step_${stepIndex}_checklist_state`;
  const validationKey = `step_${stepIndex}_valid`; // The key that dictates if the Complete button works
  
  const [checked, setChecked] = useState<boolean[]>(
    getVariable(stateKey) || new Array(items.length).fill(false)
  );

  useEffect(() => {
    const allDone = checked.length > 0 && checked.every(Boolean);
    setVariable(stateKey, checked);
    
    // ✨ If required, block step completion until all are ticked. If not required, always valid.
    setVariable(validationKey, !isRequired || allDone);
  }, [checked, isRequired]);

  const toggle = (i: number) => {
    const n = [...checked];
    n[i] = !n[i];
    setChecked(n);
  };

  if (items.length === 0) return null;

  return (
    <View className="my-2 w-full">
      {isRequired && (
        <AppText className="text-xs text-ink/50 mb-2 uppercase font-sansSemi tracking-wider">
          Required to complete step
        </AppText>
      )}
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