// src/features/quests/context/QuestExecutionContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type QuestContextType = {
  variables: Record<string, any>;
  setVariable: (key: string, value: any) => void;
  getVariable: (key: string) => any;
  clearVariablesByPrefix: (prefix: string) => void;
};

const QuestExecutionContext = createContext<QuestContextType | null>(null);

export const debugResetCardProgress = async () => {
  try {
    const storageKey = "@quest_vars_current_quest";

    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return;

    const vars = JSON.parse(raw);

    Object.keys(vars).forEach((key) => {
      if (key.startsWith("card_reveal_")) {
        delete vars[key];
      }
    });

    await AsyncStorage.setItem(storageKey, JSON.stringify(vars));

    console.log("Reset all card reveal variables.");
  } catch (e) {
    console.error("Error resetting card progress:", e);
  }
};
export function QuestExecutionProvider({ children, questId = "current_quest" }: { children: React.ReactNode, questId?: string }) {
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  
  const clearVariablesByPrefix = (prefix: string) => {
    setVariables(prev => {
      const newVars = { ...prev };
      Object.keys(newVars).forEach(key => {
        if (key.startsWith(prefix)) delete newVars[key];
      });
      AsyncStorage.setItem(storageKey, JSON.stringify(newVars));
      return newVars;
    });
  };
  // We use the questId in the storage key so different quests don't overwrite each other's data
  const storageKey = `@quest_vars_${questId}`;

  // 1. Load saved state when the quest opens
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          setVariables(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load quest state:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, [storageKey]);

  // 2. Save state to persistent storage every time a variable changes
  const setVariable = (key: string, value: any) => {
    setVariables(prev => {
      const newVars = { ...prev, [key]: value };
      AsyncStorage.setItem(storageKey, JSON.stringify(newVars)).catch(e => 
        console.error("Failed to save quest state:", e)
      );
      return newVars;
    });
  };

  const getVariable = (key: string) => variables[key];

  // Prevent the UI from rendering until we have loaded the saved state. 
  // This stops the cards from briefly flashing as "hidden" before snapping to "revealed".
  if (!isLoaded) return null;

  return (
    <QuestExecutionContext.Provider value={{ variables, setVariable, getVariable, clearVariablesByPrefix }}>
      {children}
    </QuestExecutionContext.Provider>
  );
}

export const useQuestExecution = () => {
  const context = useContext(QuestExecutionContext);
  if (!context) throw new Error("useQuestExecution must be used within a QuestExecutionProvider");
  return context;
};