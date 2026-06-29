// src/shared/types/domain.ts

import type { Accent } from "../design/tokens";

// WIDGETS //
export type WidgetType = "randomiser" | "location" | "variableDisplay";

export type RandomiserConfig = {
  options: string[];
  output?: string;
  source?: string;
};

export type LocationWidgetConfig = {
  query?: string;
  queryType?: "static" | "variable";
  centerType?: "current" | "fixed";
  radius?: number | string;
  lat?: number | string;
  lng?: number | string;
  source?: string; 
  output?: string; // Resolved: Property 'output' missing error
};

// Resolved: Missing export member error
export type VariableDisplayConfig = {
  sourceVariable: string;
  fallback?: string;
};

export type QuestWidget = 
  | {
      type: "widget";
      id: string;
      widgetType: "randomiser";
      version: number;
      config: RandomiserConfig;
    }
  | {
      type: "widget";
      id: string;
      widgetType: "location";
      version: number;
      config: LocationWidgetConfig;
    }
  | {
      type: "widget";
      id: string;
      widgetType: "variableDisplay";
      version: number;
      config: VariableDisplayConfig;
    };

export type QuestTextNode = {
  type: "text";
  id: string;
  content: string;
};

export type QuestContentBlock = QuestTextNode | QuestWidget;

// --- NEW ENUMS & TYPES ---
export type QuestCategory = "Adventure" | "Skill" | "Culture" | "Food & Drink" | "Wellness" | "Social";
export type QuestCost = "Free" | "£" | "££" | "£££";
export type QuestLength = "A few hours" | "Full day" | "Multi-day" | "Long-term";
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
  duration: string; 
  mood: QuestMood;
  accent: Accent;
  imageUrl: string;
  imagePosition?: "top" | "center" | "bottom";
  steps: string[]; 
  contentBlocks?: QuestContentBlock[];
   
  journalPrompt: string;
  pointsValue: number;

  // --- VISIBLE TAGS ---
  categories: QuestCategory[];
  category?: QuestCategory; 
  cost: QuestCost;
  length: QuestLength;
  difficulty: QuestDifficulty;
  
  // Group System Foundation
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