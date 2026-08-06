import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LoreEntry, Quest } from "../../../shared/types/domain";
import { previewLoreEntries } from "../../../shared/data/previewData";

export type QuestInterestEventType =
  | "viewed"
  | "clicked"
  | "saved"
  | "started"
  | "completed"
  | "completed_similar_journey"
  | "completed_similar_collection";

export type QuestInterestEvent = {
  questId: string;
  eventType: QuestInterestEventType;
  weight: number;
  createdAt: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

type AddPreviewLoreInput = {
  quest: Quest;
  autoCompletedQuests?: Quest[];
  title: string;
  journal: string;
  location: string;
  mood: string;
  latitude?: number | null;
  longitude?: number | null;
  people: string[];
  tags: string[];
  photoUris: string[];
};

type ExperienceState = {
  savedQuestIds: string[];
  completedQuestIds: string[];
  activeQuests: Record<string, number[]>;
  activeJourneyIds: string[];
  questInterestEvents: QuestInterestEvent[];
  previewLoreEntries: LoreEntry[];
  previewPoints: number;
  recordQuestInterestEvent: (questId: string, eventType: QuestInterestEventType, weight: number) => void;
  toggleSavedQuest: (questId: string) => void;
  markQuestComplete: (questId: string) => void;
  activateQuest: (questId: string) => void;
  startJourney: (journeyId: string) => void;
  quitQuest: (questId: string) => void;
  toggleQuestStep: (questId: string, stepIndex: number) => void;
  addPreviewLoreEntry: (input: AddPreviewLoreInput) => LoreEntry;
  deletePreviewLoreEntry: (entryId: string, questId?: string | null) => void;
};


// ✨ Wrapped in persist() to survive app reloads
export const useExperienceStore = create<ExperienceState>()(
  persist(
    (set) => ({
      savedQuestIds: ["sunrise-high-place"],
      completedQuestIds: [],
      activeQuests: {},
      activeJourneyIds: [],
      questInterestEvents: [],
      previewLoreEntries,
      previewPoints: previewLoreEntries.reduce((sum, entry) => sum + entry.pointsAwarded, 0),

      recordQuestInterestEvent: (questId, eventType, weight) =>
        set((state) => ({
          questInterestEvents: [
            {
              questId,
              eventType,
              weight,
              createdAt: new Date().toISOString()
            },
            ...state.questInterestEvents
          ].slice(0, 1000)
        })),
      
      toggleSavedQuest: (questId) =>
        set((state) => ({
          savedQuestIds: state.savedQuestIds.includes(questId)
            ? state.savedQuestIds.filter((id) => id !== questId)
            : [...state.savedQuestIds, questId]
        })),
        
      markQuestComplete: (questId) =>
        set((state) => ({
          completedQuestIds: state.completedQuestIds.includes(questId)
            ? state.completedQuestIds
            : [...state.completedQuestIds, questId]
        })),

      activateQuest: (questId) =>
        set((state) => ({
          activeQuests: {
            ...state.activeQuests,
            [questId]: state.activeQuests[questId] || []
          }
        })),

      startJourney: (journeyId) =>
        set((state) => ({
          activeJourneyIds: state.activeJourneyIds.includes(journeyId)
            ? state.activeJourneyIds
            : [...state.activeJourneyIds, journeyId]
        })),

      quitQuest: (questId) =>
        set((state) => {
          const nextActiveQuests = { ...state.activeQuests };
          delete nextActiveQuests[questId];

          return {
            activeQuests: nextActiveQuests
          };
        }),

      toggleQuestStep: (questId, stepIndex) =>
        set((state) => {
          const currentSteps = state.activeQuests[questId] || [];
          const isChecked = currentSteps.includes(stepIndex);
          const newSteps = isChecked
            ? currentSteps.filter((i) => i !== stepIndex)
            : [...currentSteps, stepIndex];
          return {
            activeQuests: {
              ...state.activeQuests,
              [questId]: newSteps
            }
          };
        }),

      addPreviewLoreEntry: (input) => {
        const now = new Date();
        const photoUris = input.photoUris.length > 0 ? input.photoUris : [input.quest.imageUrl];
        const pointsAwarded = input.quest.pointsValue + Math.min(3, input.photoUris.length) * 2;
        const entry: LoreEntry = {
          id: `local-${now.getTime()}`,
          title: input.title,
          date: formatDate(now),
          occurredAt: now.toISOString(),
          location: input.location,
          latitude: input.latitude,
          longitude: input.longitude,
          mood: input.mood,
          questId: input.quest.id,
          questTitle: input.quest.title,
          journal: input.journal,
          excerpt: input.journal,
          people: input.people,
          tags: input.tags,
          imageUrl: photoUris[0],
          photos: photoUris.map((uri, index) => ({ id: `local-photo-${now.getTime()}-${index}`, uri })),
          accent: input.quest.accent,
          pointsAwarded,
          autoCompletedQuests: input.autoCompletedQuests ?? []
        };

        set((state) => {
          const autoCompletedQuestIds = (input.autoCompletedQuests ?? []).map((quest) => quest.id);
          const nextCompletedQuestIds = Array.from(new Set([
            ...state.completedQuestIds,
            input.quest.id,
            ...autoCompletedQuestIds
          ]));
          const nextActiveQuests = { ...state.activeQuests };
          delete nextActiveQuests[input.quest.id];
          autoCompletedQuestIds.forEach((questId) => {
            delete nextActiveQuests[questId];
          });

          return {
            completedQuestIds: nextCompletedQuestIds,
            activeQuests: nextActiveQuests,
            questInterestEvents: [
              {
                questId: input.quest.id,
                eventType: "completed" as const,
                weight: 10,
                createdAt: now.toISOString()
              },
              ...autoCompletedQuestIds.map((questId) => ({
                questId,
                eventType: "completed" as const,
                weight: 10,
                createdAt: now.toISOString()
              })),
              ...state.questInterestEvents
            ].slice(0, 1000),
            previewLoreEntries: [entry, ...state.previewLoreEntries],
            previewPoints: state.previewPoints + pointsAwarded
          };
        });

        return entry;
      },
      deletePreviewLoreEntry: (entryId, questId) => {
        set((state) => {
          const entry = state.previewLoreEntries.find((e) => e.id === entryId);
          const pointsToRemove = entry ? entry.pointsAwarded : 0;
          return {
            previewLoreEntries: state.previewLoreEntries.filter((e) => e.id !== entryId),
            previewPoints: Math.max(0, state.previewPoints - pointsToRemove),
            completedQuestIds: questId 
              ? state.completedQuestIds.filter((id) => id !== questId) 
              : state.completedQuestIds
          };
        });
      }
    }),
    
    {
      name: "lore-experience-storage", // The key it will be saved under
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
