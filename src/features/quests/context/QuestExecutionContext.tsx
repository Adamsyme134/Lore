// src/features/quests/context/QuestExecutionContext.tsx
import React, { createContext, useContext, useState } from 'react';

type QuestContextType = {
  variables: Record<string, any>;
  setVariable: (key: string, value: any) => void;
  getVariable: (key: string) => any;
};

const QuestExecutionContext = createContext<QuestContextType | null>(null);

export function QuestExecutionProvider({ children }: { children: React.ReactNode }) {
  const [variables, setVariables] = useState<Record<string, any>>({});

  const setVariable = (key: string, value: any) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  const getVariable = (key: string) => variables[key];

  return (
    <QuestExecutionContext.Provider value={{ variables, setVariable, getVariable }}>
      {children}
    </QuestExecutionContext.Provider>
  );
}

export const useQuestExecution = () => {
  const context = useContext(QuestExecutionContext);
  if (!context) throw new Error("useQuestExecution must be used within a QuestExecutionProvider");
  return context;
};