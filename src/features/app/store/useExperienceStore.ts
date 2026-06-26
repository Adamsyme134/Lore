import { create } from "zustand";
import type { LoreEntry, Quest } from "../../../shared/types/domain";
import { previewLoreEntries } from "../../../shared/data/previewData";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

type AddPreviewLoreInput = {
  quest: Quest;
  title: string;
  journal: string;
  location: string;
  mood: string;
  latitude?: number | null;
  longitude?: number | null;
  tags: string[];
  photoUris: string[];
};

type ExperienceState = {
  savedQuestIds: string[];
  completedQuestIds: string[];
  previewLoreEntries: LoreEntry[];
  previewPoints: number;
  toggleSavedQuest: (questId: string) => void;
  markQuestComplete: (questId: string) => void;
  addPreviewLoreEntry: (input: AddPreviewLoreInput) => LoreEntry;
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  savedQuestIds: ["sunrise-high-place"],
  completedQuestIds: [],
  previewLoreEntries,
  previewPoints: previewLoreEntries.reduce((sum, entry) => sum + entry.pointsAwarded, 0),
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
      people: [],
      tags: input.tags,
      imageUrl: photoUris[0],
      photos: photoUris.map((uri, index) => ({ id: `local-photo-${now.getTime()}-${index}`, uri })),
      accent: input.quest.accent,
      pointsAwarded
    };

    set((state) => ({
      completedQuestIds: state.completedQuestIds.includes(input.quest.id)
        ? state.completedQuestIds
        : [...state.completedQuestIds, input.quest.id],
      previewLoreEntries: [entry, ...state.previewLoreEntries],
      previewPoints: state.previewPoints + pointsAwarded
    }));

    return entry;
  }
}));
