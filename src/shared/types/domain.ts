// src/shared/types/domain.ts

import type { Accent } from "../design/tokens";

// --- NEW ENUMS & TYPES ---
export type QuestCategory = "Adventure" | "Skill" | "Culture" | "Food & Drink" | "Wellness" | "Social";
export type QuestCost = "Free" | "£" | "££" | "£££";
export type QuestLength = "Half day" | "Full day" | "Multi-day" | "Long-term";
export type QuestDifficulty = "Easy" | "Medium" | "Challenging";
export type QuestSeason = "Spring" | "Summer" | "Autumn" | "Winter" | "All year";
export type QuestAccessibility = "Walking" | "Public Transport" | "Driving" | "Wheelchair Accessible";
export type QuestLocationType = "City" | "Town" | "Countryside" | "Abroad" | "Anywhere";

export type QuestMood = "quiet" | "social" | "curious" | "wild" | "creative";

export type Quest = {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  description: string;
  whyItMatters: string;
  locationHint: string; 
  mood: QuestMood;
  accent: Accent;
  imageUrl: string;
  steps: string[];
  journalPrompt: string;
  pointsValue: number;

  // --- VISIBLE TAGS ---
  category: QuestCategory;
  cost: QuestCost;
  length: QuestLength;
  difficulty: QuestDifficulty;
  
  // Group System Foundation (e.g., min: 1, max: 1 is Solo. min: 2 is Group forced)
  minParticipants: number;
  maxParticipants: number;

  // --- HIDDEN METADATA ---
  seasons: QuestSeason[];
  accessibility: QuestAccessibility[];
  locationTypes: QuestLocationType[];
};



export type LorePhoto = {
  id: string;
  uri: string;
  storagePath?: string | null;
  width?: number | null;
  height?: number | null;
};

export type LoreEntry = {
  id: string;
  title: string;
  date: string;
  occurredAt: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  mood: string;
  questId?: string | null;
  questTitle: string;
  journal: string;
  excerpt: string;
  people: string[];
  tags: string[];
  imageUrl: string;
  photos: LorePhoto[];
  accent: Accent;
  pointsAwarded: number;
};

export type FriendMoment = {
  id: string;
  profileId?: string;
  name: string;
  handle?: string;
  title: string;
  location: string;
  reaction: string;
  imageUrl: string;
  accent: Accent;
};

export type Profile = {
  id: string;
  handle: string;
  fullName: string;
  avatarUrl?: string | null;
  homeCity?: string | null;
  pointsTotal: number;
};

export type FriendRequest = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type NewLoreEntryInput = {
  quest: Quest;
  title: string;
  journal: string;
  location: string;
  mood: string;
  latitude?: number | null;
  longitude?: number | null;
  tags: string[];
  photoAssets: Array<{
    uri: string;
    width?: number | null;
    height?: number | null;
    mimeType?: string | null;
  }>;
};
