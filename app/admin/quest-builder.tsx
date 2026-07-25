// app/admin/quest-builder.tsx
import { useState, useEffect, useRef } from "react";
import { View, ScrollView, TextInput, Pressable, PanResponder } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../src/shared/components/AppText";
import { QuestHero } from "../../src/features/quests/components/QuestHero";
import { QuestCard } from "../../src/features/quests/components/QuestCard";
import { YouTubeWidget } from "../../src/features/quests/components/widgets/YouTubeWidget";
import { CardRevealWidget } from "../../src/features/quests/components/widgets/CardRevealWidget";
import { searchLocations, type LocationSearchResult } from "../../src/features/location/api/locationSearchApi";
import { mapJourney, type JourneyRow } from "../../src/features/quests/api/questApi";
import { previewJourneys } from "../../src/shared/data/previewData";
import type { 
  Journey,
  JourneyTimelineItem,
  Quest, 
  QuestCategory, 
  QuestCost, 
  QuestLength, 
  QuestDifficulty, 
  QuestSeason, 
  QuestAccessibility, 
  QuestLocationType, 
  QuestCountry
} from "../../src/shared/types/domain";
import { requireSupabase } from "../../src/lib/supabase";

const CATEGORIES: (QuestCategory | "All")[] = ["All", "Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"];

// -- WIDGETS SETUP -- //
type WidgetType = 'RANDOMISER' | 'LOCATION' | 'YOUTUBE' | 'LINK' | 'CHECKLIST' | 'MAP' | 'CARD_REVEAL';
export const WIDGET_REGISTRY: Record<WidgetType, {
  id: string;
  icon: string;
  label: string;
  placeholder: string;
  theme: { bg: string, border: string, text: string, containerBg: string,containerBorder: string, activeBg: string };
}> = {
  RANDOMISER: {
    id: "randomiser",
    icon: "🎲",
    label: "Randomiser",
    placeholder: "E.g. Pizza, Burgers, Sushi (comma separated)",
    theme: { bg: "bg-orange/10", border: "border-orange/40",containerBorder: "border-orange/30", text: "text-orange", containerBg: "bg-orange/5", activeBg: "active:bg-orange/20" }
  },
  LOCATION: {
    id: "location",
    icon: "📍",
    label: "Location Search",
    placeholder: "Configure Location...",
    theme: { bg: "bg-blue/10", border: "border-blue/40", text: "text-blue", containerBg: "bg-blue/5", containerBorder: "border-blue/30", activeBg: "active:bg-blue/20" }
  },
  YOUTUBE: {
    id: "youtube",
    icon: "📺",
    label: "YouTube Video",
    placeholder: "Paste URL...",
    theme: { bg: "bg-red-100", border: "border-red-300", text: "text-red-600", containerBg: "bg-red-50", containerBorder: "border-red-200", activeBg: "active:bg-red-200" }
  },
  LINK: {
    id: "link",
    icon: "🔗",
    label: "Beautiful Link",
    placeholder: "Configure Link...",
    theme: { bg: "bg-stone-200", border: "border-line", text: "text-ink", containerBg: "bg-stone", containerBorder: "border-line", activeBg: "active:bg-stone-300" }
  },
  CHECKLIST: {
    id: "checklist",
    icon: "☑️",
    label: "Checklist",
    placeholder: "Pack water, Check map...",
    theme: { bg: "bg-green-100", border: "border-green-300", text: "text-green-700", containerBg: "bg-green-50", containerBorder: "border-green-200", activeBg: "active:bg-green-200" }
  },
  MAP: {
    id: "map",
    icon: "🗺️",
    label: "Interactive Map",
    placeholder: "Configure Map...",
    theme: { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-700", containerBg: "bg-emerald-50", containerBorder: "border-emerald-200", activeBg: "active:bg-emerald-200" }
  },
  CARD_REVEAL: {
    id: "card_reveal",
    icon: "🃏",
    label: "Card Reveal",
    placeholder: "Configure Cards...",
    theme: { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-700", containerBg: "bg-purple-50", containerBorder: "border-purple-200", activeBg: "active:bg-purple-200" }
  },
};

const SLASH_WIDGETS = Object.entries(WIDGET_REGISTRY).map(([type, data]) => ({ type, ...data }));
const WIDGET_REGEX = /(\[[A-Z_]+:.*?\])/g;

// Helpers for Config String Serialization (e.g., q=cafe&qType=static)
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

const serializeConfig = (obj: Record<string, string>) => {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
};
// Helper to extract titles from step strings
const extractTitleAndText = (stepStr: string) => {
  const match = stepStr.match(/\[TITLE:(.*?)\]/);
  if (match) {
    return { title: match[1], text: stepStr.replace(match[0], '') };
  }
  return { title: "", text: stepStr };
};

const buildStepString = (title: string, text: string) => {
  if (title) return `[TITLE:${title}]${text}`;
  return text;
};
// Helper to extract exposed variables from steps
const extractExposedVariables = (steps: string[]): string[] => {
  const vars: string[] = ["$current_city", "$user_home"]; // Built-in defaults
  
  steps.forEach(step => {
    // Check for ANY widget that might output a variable
    const matches = step.match(/\[(?:RANDOMISER|LOCATION):(.*?)\]/g);
    if (matches) {
      matches.forEach(match => {
        const inner = match.match(/^\[(?:RANDOMISER|LOCATION):(.*)\]$/);
        if (inner && inner[1] && inner[1].includes('=')) {
          const cfg = parseConfig(inner[1]);
          if (cfg.isExposed === 'true' && cfg.variableName) {
            vars.push(cfg.variableName);
          }
        }
      });
    }
  });
  
  return vars;
};
function LocationAutocomplete({ label, value, onSelect }: { label: string, value: string, onSelect: (val: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationRequestId = useRef(0);
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const fetchLocation = async (text: string, requestId: number) => {
    try {
      const data = await searchLocations(text, 5);
      if (requestId !== locationRequestId.current) return;
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (e) {
      console.error(e);
    }
  };

  const search = (text: string) => {
    setQuery(text);
    const requestId = ++locationRequestId.current;
    
    // ✨ Clear existing timer if user types again quickly
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // ✨ Only fetch after 500ms of inactivity
    debounceTimer.current = setTimeout(() => {
      fetchLocation(text, requestId);
    }, 500);
  };

  return (
    <View className="mb-6 relative z-[100]">
      {label ? <AppText variant="subtitle" className="mb-2 text-xs">{label}</AppText> : null}
      <TextInput
        className="bg-surface border border-line rounded-lg p-3 font-sans text-ink"
        placeholder="Search city, region, or country..."
        value={query}
        onChangeText={search} // ✨ Debounced search
      />
      {isOpen && results.length > 0 && (
        <View className="absolute top-full mt-1 left-0 right-0 bg-surface border border-line rounded-lg shadow-lg z-[100] max-h-48 overflow-hidden">
          <ScrollView nestedScrollEnabled>
            {results.map((item, i) => {
              return (
                <Pressable
                  key={item.id || i}
                  onPress={() => {
                    onSelect(item.name);
                    setQuery(item.name);
                    setIsOpen(false);
                  }}
                  className="p-3 border-b border-line/50 hover:bg-stone"
                >
                  <AppText className="text-ink font-sans text-sm">{item.name}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
function Dropdown({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (val: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="flex-1 relative z-50 mb-6">
      {label ? <AppText variant="subtitle" className="mb-2 text-xs">{label}</AppText> : null}
      <Pressable onPress={() => setIsOpen(!isOpen)} className="bg-surface border border-line rounded-lg p-3 flex-row justify-between items-center">
        <AppText className="text-ink font-sans">{value || 'Select an option'}</AppText>
        <AppText className="text-ink/50 text-xs">▼</AppText>
      </Pressable>
      {isOpen && (
        <View className="absolute top-full mt-1 left-0 right-0 bg-surface border border-line rounded-lg shadow-lg z-[100] max-h-48 overflow-hidden">
          <ScrollView nestedScrollEnabled>
            {options.map((opt) => (
              <Pressable key={opt} onPress={() => { onSelect(opt); setIsOpen(false); }} className="p-3 border-b border-line/50 hover:bg-stone">
                <AppText className={value === opt ? "font-sansSemi text-orange" : "text-ink"}>{opt}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ToggleGroup({ label, options, selected, onSelect }: { label: string, options: string[], selected: string, onSelect: (val: string) => void }) {
  return (
    <View className="mb-4">
      {label ? <AppText variant="subtitle" className="mb-2 text-xs">{label}</AppText> : null}
      <View className="flex-row rounded-lg border border-line overflow-hidden bg-surface">
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <Pressable key={opt} onPress={() => onSelect(opt)} className={`flex-1 p-2 items-center justify-center ${isActive ? 'bg-accent' : 'bg-transparent'}`}>
              <AppText className={isActive ? 'text-accentText font-sansSemi text-xs' : 'text-ink text-xs'}>{opt}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiToggleGroup({ label, options, selected, onSelect }: { label: string, options: string[], selected: string[], onSelect: (val: string[]) => void }) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onSelect(selected.filter(item => item !== opt));
    } else {
      onSelect([...selected, opt]);
    }
  };

  return (
    <View className="mb-8">
      <AppText variant="subtitle" className="mb-2">{label}</AppText>
      <View className="flex-row flex-wrap gap-3">
        {options.map((opt) => {
          const isActive = selected.includes(opt);
          return (
            <Pressable 
              key={opt} 
              onPress={() => toggle(opt)} 
              className={`px-4 py-2 rounded-full border ${isActive ? 'bg-accent border-accent' : 'bg-surface border-line shadow-sm'}`}
            >
              <AppText className={isActive ? 'text-accentText font-sansSemi' : 'text-ink'}>{opt}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createBlankQuest = (): Quest => ({
  id: `draft-${Date.now()}`,
  slug: `new-quest-${Date.now()}`,
  title: "Untitled Quest",
  kicker: "NEW ADVENTURE",
  stats: { views: 0, inProgress: 0, completed: 0, recentAvatars: [] },
  description: "Describe the adventure here...",
  whyItMatters: "Explain why they should do this...",
  locationHint: "Anywhere",
  duration: "Half day", 
  mood: "wild",
  accent: "orange",
  imageUrl: "https://images.unsplash.com/photo-1501555088652-021faa106b9b",
  steps: [""], 
  journalPrompt: "What did you learn?",
  pointsValue: 15,
  imagePosition: "50% 50%",
  galleryUrls: [],
  categories: ["Adventure"],
  cost: "Free" as QuestCost,
  length: "A few hours" as QuestLength,
  difficulty: "Medium" as QuestDifficulty,
  country: "Any" as QuestCountry,
  minParticipants: 1,
  maxParticipants: 1,
  seasons: ["All year"] as QuestSeason[],
  accessibility: [] as QuestAccessibility[],
  locationTypes: ["Anywhere"] as QuestLocationType[]
});

const createBlankJourney = (quests: Quest[] = []): Journey => {
  const nextQuest = quests[0];
  return {
    id: `draft-journey-${Date.now()}`,
    slug: `new-journey-${Date.now()}`,
    title: "Untitled Journey",
    description: "A themed path of experiences.",
    backgroundImageUrl: nextQuest?.imageUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
    imagePosition: "50% 50%",
    iconName: "trail-sign-outline",
    timeline: [
      { id: `timeline-${Date.now()}-1`, title: "First experience", questId: nextQuest?.id, isComplete: true },
      { id: `timeline-${Date.now()}-2`, title: "Second experience", isComplete: false },
      { id: `timeline-${Date.now()}-3`, title: "Third experience", isComplete: false }
    ],
    completedCount: 1,
    totalCount: 6,
    nextQuestId: nextQuest?.id || null,
    nextQuestTitle: nextQuest?.title || "Choose the next quest",
    nextQuestImageUrl: nextQuest?.imageUrl || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=85",
    questIds: nextQuest ? [nextQuest.id] : [],
    isActive: true
  };
};

const timelineToText = (timeline: JourneyTimelineItem[]) =>
  timeline.map((item) => `${item.isComplete ? "[x]" : "[ ]"} ${item.title}`).join("\n");

const textToTimeline = (value: string, current: JourneyTimelineItem[]): JourneyTimelineItem[] =>
  value
    .split("\n")
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const isComplete = /^\[(x|X)\]/.test(trimmed);
      const title = trimmed.replace(/^\[(x|X| )\]\s*/, "").trim();
      return {
        id: current[index]?.id || `timeline-${Date.now()}-${index}`,
        title: title || `Step ${index + 1}`,
        questId: current[index]?.questId,
        isComplete
      };
    })
    .filter(Boolean) as JourneyTimelineItem[];

function DraggableImageCrop({ imageUrl, value, onChange }: { imageUrl: string, value: string, onChange: (val: string) => void }) {
  const panRef = useRef({ x: 50, y: 50 });
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (value && value.includes('%')) {
      const match = value.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (!isNaN(x) && !isNaN(y)) {
          panRef.current = { x, y };
          setPos({ x, y });
        }
      }
    }
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const dx = (gestureState.dx / 200) * 100;
        const dy = (gestureState.dy / 200) * 100;
        let newX = Math.min(100, Math.max(0, panRef.current.x - dx));
        let newY = Math.min(100, Math.max(0, panRef.current.y - dy));
        setPos({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gestureState) => {
        const dx = (gestureState.dx / 200) * 100;
        const dy = (gestureState.dy / 200) * 100;
        let newX = Math.min(100, Math.max(0, panRef.current.x - dx));
        let newY = Math.min(100, Math.max(0, panRef.current.y - dy));
        panRef.current = { x: newX, y: newY };
        onChange(`${newX.toFixed(1)}% ${newY.toFixed(1)}%`);
      }
    })
  ).current;

  return (
    <View className="mb-6">
      <AppText variant="subtitle" className="mb-2">Image Focus (Drag to pan)</AppText>
      <View className="rounded-lg overflow-hidden border border-line bg-stone" style={{ width: '100%', height: 200 }} {...panResponder.panHandlers}>
        <Image
          source={{ uri: imageUrl || 'https://via.placeholder.com/400' }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          contentPosition={{ left: `${pos.x}%`, top: `${pos.y}%` } as any}
          pointerEvents="none"
        />
        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <View className="w-8 h-8 rounded-full border-2 border-white bg-black/20 shadow-md flex items-center justify-center">
            <AppText className="text-white text-[10px]">┼</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function QuestBuilderAdmin() {
  const [leftPanelVisible, setLeftPanelVisible] = useState(true); // <-- ADD THIS
  const [view, setView] = useState<'grid' | 'editor'>('grid');
  const [libraryKind, setLibraryKind] = useState<'quests' | 'journeys'>('quests');
  const [editorKind, setEditorKind] = useState<'quest' | 'journey'>('quest');
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'tags' | 'metadata'>('basic');
  const [previewMode, setPreviewMode] = useState<'hero' | 'details'>('hero');
  const [activeWidgetConfig, setActiveWidgetConfig] = useState<{
    stepIndex: number; 
    chunkIndex: number; 
    type: WidgetType; 
    config: string;
  } | null>(null);
  
  // Track cursor position to trigger inline edits mid-sentence
  const chunkTextsRef = useRef<Record<string, string>>({});
  const selectionRef = useRef<Record<string, {start: number, end: number}>>({});
  const [slashMenu, setSlashMenu] = useState<{
    visible: boolean;
    query: string;
    stepIndex: number;
    chunkIndex: number;
    cursor: number;
  }>({ visible: false, query: "", stepIndex: -1, chunkIndex: -1, cursor: -1 });
  
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [savedJourneys, setSavedJourneys] = useState<Journey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "All">("All");
  const [quest, setQuest] = useState<Quest>(createBlankQuest());
  const [journey, setJourney] = useState<Journey>(createBlankJourney());

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const client = requireSupabase();
        const { data, error } = await client
          .from('quests')
          .select('*')
          .eq('is_active', true) 
          .order('created_at', { ascending: false });
        if (error) throw error;

        if (data) {
          const mappedQuests: Quest[] = data.map(q => ({
            id: q.id,
            slug: q.slug,
            title: q.title,
            kicker: q.kicker,
            description: q.description,
            whyItMatters: q.why_it_matters || "",
            locationHint: q.location_hint || "Anywhere",
            duration: q.duration_label || q.length || "Half day", 
            mood: q.mood || "wild",
            accent: q.accent || "orange",
            imageUrl: q.image_url,
            steps: q.steps || [],
            journalPrompt: q.journal_prompt || "",
            pointsValue: q.points_value || 10,
            imagePosition: q.image_position || "center",
            galleryUrls: q.gallery_urls || [],
            categories: (q.categories as QuestCategory[]) || (q.category ? [q.category] : ["Adventure"]),
            cost: (q.cost as QuestCost) || "Free",
            length: (q.length as QuestLength) || "A few hours",
            difficulty: (q.difficulty as QuestDifficulty) || "Medium",
            country: q.country || "Any",
            minParticipants: q.min_participants || 1,
            maxParticipants: q.max_participants || 1,
            seasons: (q.seasons as QuestSeason[]) || ["All year"],
            accessibility: (q.accessibility as QuestAccessibility[]) || [],
            locationTypes: (q.location_types as QuestLocationType[]) || ["Anywhere"],
            // ✨ PARSE INCOMING STATS (Fallback to 0 if your DB views aren't set up yet)
            stats: {
              views: q.view_count || 0,
              inProgress: q.active_count || 0,
              completed: q.completed_count || 0,
              recentAvatars: q.recent_avatars || []
            }
          }));
          setSavedQuests(mappedQuests);
        }
      } catch (error) {
        console.error("Error fetching quests:", error);
      }
    };
    fetchQuests();
  }, []);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        const client = requireSupabase();
        const { data, error } = await client
          .from('journeys')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (error) throw error;

        setSavedJourneys((data || []).map((row) => mapJourney(row as JourneyRow)));
      } catch (error) {
        console.error("Error fetching journeys:", error);
        setSavedJourneys(previewJourneys);
      }
    };
    fetchJourneys();
  }, []);

  const updateField = (field: keyof Quest, value: any) => {
    setQuest((prev) => ({ ...prev, [field]: value }));
  };

  const updateJourneyField = (field: keyof Journey, value: any) => {
    setJourney((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const client = requireSupabase(); 
      const questData = {
        slug: quest.slug,
        title: quest.title,
        kicker: quest.kicker,
        description: quest.description,
        why_it_matters: quest.whyItMatters,
        location_hint: quest.locationHint,
        duration_label: quest.length,
        mood: quest.mood,
        accent: quest.accent,
        image_url: quest.imageUrl,
        steps: quest.steps.filter(s => s.trim() !== ""),
        journal_prompt: quest.journalPrompt,
        points_value: quest.pointsValue,
        image_position: quest.imagePosition,
        gallery_urls: quest.galleryUrls,
        categories: quest.categories,
        cost: quest.cost,
        length: quest.length,
        difficulty: quest.difficulty,
        country: quest.country,
        min_participants: quest.minParticipants,
        max_participants: quest.maxParticipants,
        seasons: quest.seasons,
        accessibility: quest.accessibility,
        location_types: quest.locationTypes,
        is_curated: true,
        is_active: true
      };

      const isNew = quest.id.startsWith("draft-");
      let result;
      if (isNew) {
        result = await client.from('quests').insert([questData]).select().single();
      } else {
        result = await client.from('quests').update(questData).eq('id', quest.id).select().single();
      }

      if (result.error) throw result.error;
      alert("Quest successfully saved!");
      setSavedQuests(prev => {
        const mapped = { ...quest, id: result.data.id }; 
        return isNew ? [mapped, ...prev] : prev.map(q => q.id === quest.id ? mapped : q);
      });
      setView('grid');
    } catch (error: any) {
      alert(`Failed to save quest: ${error.message || "Check terminal"}`);
    }
  };

  const handleSaveJourney = async () => {
    try {
      const client = requireSupabase();
      const journeyData = {
        slug: journey.slug,
        title: journey.title,
        description: journey.description,
        background_image_url: journey.backgroundImageUrl,
        image_position: journey.imagePosition,
        icon_name: journey.iconName,
        timeline: journey.timeline,
        completed_count: journey.completedCount,
        total_count: journey.totalCount,
        next_quest_id: journey.nextQuestId,
        next_quest_title: journey.nextQuestTitle,
        next_quest_image_url: journey.nextQuestImageUrl,
        quest_ids: journey.questIds,
        is_active: true
      };

      const isNew = journey.id.startsWith("draft-");
      const result = isNew
        ? await client.from('journeys').insert([journeyData]).select().single()
        : await client.from('journeys').update(journeyData).eq('id', journey.id).select().single();

      if (result.error) throw result.error;
      alert("Journey successfully saved!");
      setSavedJourneys(prev => {
        const mapped = { ...journey, id: result.data.id };
        return isNew ? [mapped, ...prev] : prev.map(item => item.id === journey.id ? mapped : item);
      });
      setLibraryKind('journeys');
      setView('grid');
    } catch (error: any) {
      alert(`Failed to save journey: ${error.message || "Check terminal"}`);
    }
  };

  const handleDeleteJourney = async () => {
    if (window.confirm(`Are you sure you want to permanently delete "${journey.title}"?`)) {
      try {
        const client = requireSupabase();
        if (!journey.id.startsWith('draft-')) {
          const { error } = await client.from('journeys').update({ is_active: false }).eq('id', journey.id);
          if (error) throw error;
        }
        setSavedJourneys(prev => prev.filter(item => item.id !== journey.id));
        setLibraryKind('journeys');
        setView('grid');
        alert("Journey deleted successfully.");
      } catch (error: any) {
        alert("Failed to delete journey: " + (error.message || "Unknown error"));
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete "${quest.title}"?`)) {
      try {
        const client = requireSupabase();
        if (!quest.id.startsWith('draft-')) {
          const { error } = await client.from('quests').update({ is_active: false }).eq('id', quest.id);
          if (error) throw error;
        }
        setSavedQuests(prev => prev.filter(q => q.id !== quest.id));
        setView('grid');
        alert("Quest deleted successfully.");
      } catch (error: any) {
        alert("Failed to delete quest: " + (error.message || "Unknown error"));
      }
    }
  };

  if (view === 'grid') {
    const filtered = savedQuests.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase());
      const safeCategories = q.categories || (q.category ? [q.category] : ["Adventure"]);
      const matchesCategory = activeCategory === "All" || safeCategories.includes(activeCategory);
      return matchesSearch && matchesCategory;
    });
    const filteredJourneys = savedJourneys.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <View className="flex-1 bg-surface p-10">
        <View className="flex-row justify-between items-center mb-10">
          <View>
            <AppText variant="display">{libraryKind === 'quests' ? 'Quest Library' : 'Journey Library'}</AppText>
            <View className="mt-4 flex-row rounded-full border border-line bg-stone p-1">
              {(['quests', 'journeys'] as const).map(kind => (
                <Pressable key={kind} onPress={() => setLibraryKind(kind)} className={`px-5 py-2 rounded-full ${libraryKind === kind ? 'bg-accent' : 'bg-transparent'}`}>
                  <AppText className={libraryKind === kind ? 'text-accentText font-sansSemi capitalize' : 'text-ink/60 capitalize'}>{kind}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="flex-row gap-3">
            <Pressable onPress={() => { setQuest(createBlankQuest()); setEditorKind('quest'); setView('editor'); setPreviewMode('hero'); setActiveTab('basic'); }} className="bg-stone px-6 py-3 rounded-full border border-line">
              <AppText className="text-ink font-sansSemi">+ Create New Quest</AppText>
            </Pressable>
            <Pressable onPress={() => { setJourney(createBlankJourney(savedQuests)); setEditorKind('journey'); setView('editor'); }} className="bg-accent px-6 py-3 rounded-full">
              <AppText className="text-accentText font-sansSemi">+ Create New Journey</AppText>
            </Pressable>
          </View>
        </View>

        <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink max-w-md" placeholder={libraryKind === 'quests' ? 'Search quests...' : 'Search journeys...'} value={searchQuery} onChangeText={setSearchQuery} />

        {libraryKind === 'quests' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 max-h-12" contentContainerStyle={{ gap: 8 }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <Pressable key={cat} onPress={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-full border ${isActive ? 'bg-accent border-accent' : 'bg-surface border-line shadow-sm'}`}>
                  <AppText className={isActive ? 'text-accentText font-sansSemi' : 'text-ink'}>{cat}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {libraryKind === 'quests' && filtered.length === 0 ? (
          <View className="items-center justify-center p-20 border border-dashed border-line rounded-[24px]">
            <AppText className="text-ink/50 mb-4">No quests found.</AppText>
          </View>
        ) : libraryKind === 'quests' ? (
          <ScrollView>
            <View className="flex-row flex-wrap gap-6">
              {filtered.map(q => (
                <View key={q.id} className="w-64 mb-4">
                  <QuestCard quest={q} />
                  
                  {/* ✨ NEW ADMIN ANALYTICS ROW */}
                  <View className="mt-3 mb-2 bg-surface border border-line rounded-xl p-3 flex-row justify-between shadow-sm">
                    <View className="items-center flex-1 border-r border-line/50">
                      <AppText className="text-[9px] text-ink/50 uppercase tracking-widest font-sansSemi mb-1">Views</AppText>
                      <AppText className="text-ink font-sansSemi text-sm">{q.stats?.views || 0}</AppText>
                    </View>
                    <View className="items-center flex-1 border-r border-line/50">
                      <AppText className="text-[9px] text-ink/50 uppercase tracking-widest font-sansSemi mb-1">Active</AppText>
                      <AppText className="text-orange font-sansSemi text-sm">{q.stats?.inProgress || 0}</AppText>
                    </View>
                    <View className="items-center flex-1">
                      <AppText className="text-[9px] text-ink/50 uppercase tracking-widest font-sansSemi mb-1">Done</AppText>
                      <AppText className="text-green-600 font-sansSemi text-sm">{q.stats?.completed || 0}</AppText>
                    </View>
                  </View>

                  <Pressable onPress={() => { setQuest(q); setEditorKind('quest'); setView('editor'); setPreviewMode('hero'); setActiveTab('basic'); }} className="bg-stone py-2 rounded-lg items-center border border-line hover:bg-stone-300">
                    <AppText className="text-ink font-sansSemi text-sm">Edit Quest</AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : filteredJourneys.length === 0 ? (
          <View className="items-center justify-center p-20 border border-dashed border-line rounded-[24px]">
            <AppText className="text-ink/50 mb-4">No journeys found.</AppText>
          </View>
        ) : (
          <ScrollView>
            <View className="flex-row flex-wrap gap-6">
              {filteredJourneys.map(item => (
                <View key={item.id} className="w-72 mb-4">
                  <View className="h-80 overflow-hidden rounded-[24px] border border-line bg-stone">
                    <Image source={{ uri: item.backgroundImageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.85)"]}
                      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View className="absolute bottom-0 left-0 right-0 p-5">
                      <AppText variant="title" className="text-ivory mb-2">{item.title}</AppText>
                      <AppText className="text-ivory/80 mb-4">{item.completedCount} / {item.totalCount} experiences</AppText>
                      <View className="flex-row items-center gap-2">
                        {item.timeline.slice(0, 7).map(step => (
                          <View key={step.id} className={`h-4 w-4 rounded-full border ${step.isComplete ? 'bg-accent border-accent' : 'border-ivory/60 bg-transparent'}`} />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Pressable onPress={() => { setJourney(item); setEditorKind('journey'); setView('editor'); }} className="mt-3 bg-stone py-2 rounded-lg items-center border border-line hover:bg-stone-300">
                    <AppText className="text-ink font-sansSemi text-sm">Edit Journey</AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  if (editorKind === 'journey') {
    const selectedNextQuest = savedQuests.find(q => q.id === journey.nextQuestId);
    const timelineText = timelineToText(journey.timeline);

    return (
      <View className="flex-1 flex-row bg-surface">
        <View className="w-1/3 max-w-[520px] border-r border-line bg-surface">
          <View className="p-6 border-b border-line flex-row justify-between items-center bg-surface">
            <Pressable onPress={() => { setLibraryKind('journeys'); setView('grid'); }} className="px-4 py-2 bg-stone rounded-md"><AppText className="text-ink">← Back</AppText></Pressable>
            <View className="flex-row gap-3">
              {!journey.id.startsWith('draft-') && (
                <Pressable onPress={handleDeleteJourney} className="px-4 py-2 border border-[#E63946] rounded-md bg-[#E63946]/10"><AppText className="text-[#E63946] font-sansSemi">Delete</AppText></Pressable>
              )}
              <Pressable onPress={handleSaveJourney} className="px-6 py-2 bg-orange rounded-md"><AppText className="text-white font-sansSemi">Save</AppText></Pressable>
            </View>
          </View>

          <ScrollView className="flex-1 p-8" contentContainerStyle={{ paddingBottom: 100 }}>
            <AppText variant="subtitle" className="mb-2">Title</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={journey.title} onChangeText={(txt) => updateJourneyField("title", txt)} />

            <AppText variant="subtitle" className="mb-2">Slug</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={journey.slug} onChangeText={(txt) => updateJourneyField("slug", txt)} />

            <AppText variant="subtitle" className="mb-2">Description</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" multiline numberOfLines={3} value={journey.description} onChangeText={(txt) => updateJourneyField("description", txt)} />

            <AppText variant="subtitle" className="mb-2">Background Image URL</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={journey.backgroundImageUrl} onChangeText={(txt) => updateJourneyField("backgroundImageUrl", txt)} />
            <DraggableImageCrop imageUrl={journey.backgroundImageUrl} value={journey.imagePosition || "50% 50%"} onChange={(val) => updateJourneyField("imagePosition", val)} />

            <AppText variant="subtitle" className="mb-2">Icon Name</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" placeholder="Ionicons name, e.g. trail-sign-outline" value={journey.iconName || ""} onChangeText={(txt) => updateJourneyField("iconName", txt)} />

            <View className="flex-row gap-4">
              <View className="flex-1">
                <AppText variant="subtitle" className="mb-2">Completed</AppText>
                <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" keyboardType="number-pad" value={journey.completedCount.toString()} onChangeText={(txt) => updateJourneyField("completedCount", parseInt(txt) || 0)} />
              </View>
              <View className="flex-1">
                <AppText variant="subtitle" className="mb-2">Total</AppText>
                <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" keyboardType="number-pad" value={journey.totalCount.toString()} onChangeText={(txt) => updateJourneyField("totalCount", parseInt(txt) || 0)} />
              </View>
            </View>

            <AppText variant="subtitle" className="mb-2">Checklist Timeline</AppText>
            <TextInput
              className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink"
              multiline
              numberOfLines={8}
              value={timelineText}
              onChangeText={(txt) => {
                const nextTimeline = textToTimeline(txt, journey.timeline);
                setJourney(prev => ({
                  ...prev,
                  timeline: nextTimeline,
                  completedCount: nextTimeline.filter(item => item.isComplete).length
                }));
              }}
            />

            <AppText variant="subtitle" className="mb-3">Included Quests</AppText>
            <View className="mb-8 flex-row flex-wrap gap-2">
              {savedQuests.map(q => {
                const isSelected = journey.questIds.includes(q.id);
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      setJourney(prev => ({
                        ...prev,
                        questIds: isSelected ? prev.questIds.filter(id => id !== q.id) : [...prev.questIds, q.id]
                      }));
                    }}
                    className={`px-3 py-2 rounded-full border ${isSelected ? 'bg-accent border-accent' : 'bg-surface border-line'}`}
                  >
                    <AppText className={isSelected ? 'text-accentText text-xs font-sansSemi' : 'text-ink text-xs'}>{q.title}</AppText>
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="subtitle" className="mb-3">Next Up Quest</AppText>
            <View className="mb-6 gap-2">
              {savedQuests.map(q => {
                const isSelected = journey.nextQuestId === q.id;
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      setJourney(prev => ({
                        ...prev,
                        nextQuestId: q.id,
                        nextQuestTitle: q.title,
                        nextQuestImageUrl: q.imageUrl,
                        questIds: prev.questIds.includes(q.id) ? prev.questIds : [...prev.questIds, q.id]
                      }));
                    }}
                    className={`p-3 rounded-xl border flex-row items-center ${isSelected ? 'bg-accent/20 border-accent' : 'bg-surface border-line'}`}
                  >
                    <Image source={{ uri: q.imageUrl }} className="w-12 h-12 rounded-lg mr-3 bg-stone" contentFit="cover" />
                    <AppText className={isSelected ? 'text-ink font-sansSemi flex-1' : 'text-ink flex-1'}>{q.title}</AppText>
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="subtitle" className="mb-2">Next Up Title Override</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={journey.nextQuestTitle} onChangeText={(txt) => updateJourneyField("nextQuestTitle", txt)} />

            <AppText variant="subtitle" className="mb-2">Next Up Image URL</AppText>
            <TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={journey.nextQuestImageUrl} onChangeText={(txt) => updateJourneyField("nextQuestImageUrl", txt)} />
          </ScrollView>
        </View>

        <View className="flex-1 bg-stone items-center justify-center p-8">
          <View className="w-[360px] h-[520px] overflow-hidden rounded-[32px] border-[8px] border-white bg-surface shadow-xl">
            <Image source={{ uri: journey.backgroundImageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            <LinearGradient
              colors={["rgba(0,0,0,0.12)", "rgba(0,0,0,0.68)", "rgba(7,20,18,0.96)"]}
              locations={[0, 0.48, 1]}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
            />
            <View className="absolute inset-0 justify-between p-8">
              <View>
                <View className="mb-8 h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-background/80">
                  <AppText className="text-ivory text-xl">~</AppText>
                </View>
                <AppText variant="title" className="text-ivory">{journey.title}</AppText>
                <AppText className="mt-2 text-lg leading-6 text-ivory/85">{journey.description}</AppText>
                <View className="mt-6 flex-row items-center">
                  {journey.timeline.slice(0, 7).map((item, index, visibleItems) => (
                    <View key={item.id} className="flex-1 flex-row items-center">
                      <View className={`h-6 w-6 rounded-full border ${item.isComplete ? 'bg-accent border-accent' : 'border-ivory/60 bg-background/40'}`} />
                      {index < visibleItems.length - 1 ? <View className="h-px flex-1 bg-ivory/45" /> : null}
                    </View>
                  ))}
                </View>
                <AppText className="mt-3 text-ivory/80">{journey.completedCount} / {journey.totalCount} experiences</AppText>
              </View>
              <View>
                <AppText className="mb-3 text-ivory/85">Next up</AppText>
                <View className="flex-row items-center">
                  <Image source={{ uri: journey.nextQuestImageUrl || selectedNextQuest?.imageUrl }} className="mr-4 h-14 w-14 rounded-lg bg-stone" contentFit="cover" />
                  <AppText className="flex-1 text-lg leading-6 text-ivory">{journey.nextQuestTitle}</AppText>
                  <AppText className="text-ivory/60 text-2xl">&gt;</AppText>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const exposedVariables = extractExposedVariables(quest.steps);

  return (
    <View className="flex-1 flex-row bg-surface">
      {/* --- LEFT PANEL: Base Configuration --- */}
      {leftPanelVisible && (
      <View className="w-1/3 border-r border-line bg-surface flex-1 max-w-[500px]">
        <View className="p-6 border-b border-line flex-row justify-between items-center bg-surface">
          <Pressable onPress={() => setView('grid')} className="px-4 py-2 bg-stone rounded-md"><AppText className="text-ink">← Back</AppText></Pressable>
          <View className="flex-row gap-3">
            {!quest.id.startsWith('draft-') && (
              <Pressable onPress={handleDelete} className="px-4 py-2 border border-[#E63946] rounded-md bg-[#E63946]/10"><AppText className="text-[#E63946] font-sansSemi">Delete</AppText></Pressable>
            )}
            <Pressable onPress={handleSave} className="px-6 py-2 bg-orange rounded-md"><AppText className="text-white font-sansSemi">Save</AppText></Pressable>
          </View>
        </View>

        <View className="flex-row border-b border-line bg-stone">
          {(['basic', 'tags', 'metadata'] as const).map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} className={`flex-1 p-4 items-center ${activeTab === tab ? 'bg-surface border-b-2 border-orange' : ''}`}>
              <AppText className={activeTab === tab ? 'text-ink font-sansSemi' : 'text-ink/50 capitalize'}>{tab} Info</AppText>
            </Pressable>
          ))}
        </View>

        <ScrollView className="flex-1 p-8" contentContainerStyle={{ paddingBottom: 100 }}>
          {activeTab === 'basic' && (
            <View>
              <AppText variant="subtitle" className="mb-2">Title</AppText><TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.title} onChangeText={(txt) => updateField("title", txt)} />
              <AppText variant="subtitle" className="mb-2">Kicker (Eyebrow)</AppText><TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.kicker} onChangeText={(txt) => updateField("kicker", txt)} />
              <AppText variant="subtitle" className="mb-2">Description</AppText><TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" multiline numberOfLines={3} value={quest.description} onChangeText={(txt) => updateField("description", txt)} />
              <AppText variant="subtitle" className="mb-2">Image URL</AppText><TextInput className="bg-surface border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.imageUrl} onChangeText={(txt) => updateField("imageUrl", txt)} />
              <DraggableImageCrop imageUrl={quest.imageUrl} value={quest.imagePosition || "50% 50%"} onChange={(val) => updateField("imagePosition", val)} />
            
              
            
            <AppText variant="subtitle" className="mb-2 mt-6">Optional Gallery (Up to 3 photos)</AppText>
              <View className="flex-row gap-2 mb-6">
                {[0, 1, 2].map(i => {
                  const url = quest.galleryUrls?.[i];
                  return (
                    <View key={`gal-${i}`} className="flex-1 flex-col gap-2">
                      {url ? (
                        <Image source={{ uri: url }} className="w-full aspect-square rounded-lg bg-stone border border-line" contentFit="cover" />
                      ) : (
                        <View className="w-full aspect-square rounded-lg bg-stone/50 border border-line border-dashed items-center justify-center">
                          <AppText className="text-ink/30 text-[10px]">Empty</AppText>
                        </View>
                      )}
                      <TextInput
                        className="bg-surface border border-line rounded-lg p-2 font-sans text-xs text-ink"
                        placeholder={`URL ${i + 1}`}
                        value={url || ''}
                        onChangeText={(txt) => {
                          const newGallery = [...(quest.galleryUrls || [])];
                          newGallery[i] = txt;
                          updateField("galleryUrls", newGallery);
                        }}
                      />
                    </View>
                  );
                })}
              </View>
       
              </View>
          )}

          {activeTab === 'tags' && (
            <View className="z-50">
              <ToggleGroup label="Solo or Group?" options={["Solo", "Group"]} selected={quest.maxParticipants > 1 ? "Group" : "Solo"} onSelect={(val) => { if (val === 'Solo') updateField("maxParticipants", 1); if (val === 'Group') updateField("maxParticipants", 5); }} />
              {quest.maxParticipants > 1 && (
                <View className="flex-row gap-4 mb-6 bg-stone p-4 rounded-lg">
                  <View className="flex-1"><AppText className="text-xs mb-1">Min Size</AppText><TextInput className="bg-surface border border-line rounded p-2" value={quest.minParticipants.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("minParticipants", parseInt(txt) || 2)} /></View>
                  <View className="flex-1"><AppText className="text-xs mb-1">Max Size</AppText><TextInput className="bg-surface border border-line rounded p-2" value={quest.maxParticipants.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("maxParticipants", parseInt(txt) || 5)} /></View>
                </View>
              )}
              <View className="z-40 mb-2"><MultiToggleGroup label="Categories" options={["Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"]} selected={quest.categories} onSelect={(val) => updateField("categories", val)} /></View>
              <View className="mb-6 z-40"><Dropdown label="Cost" value={quest.cost} options={["Free", "£", "££", "£££"]} onSelect={(val) => updateField("cost", val)} /></View>
              <View className="flex-row gap-4 z-30"><Dropdown label="Length" value={quest.length} options={["A few hours", "Full day", "Multi-day", "Long-term"]} onSelect={(val) => updateField("length", val)} /><Dropdown label="Difficulty" value={quest.difficulty} options={["Easy", "Medium", "Challenging"]} onSelect={(val) => updateField("difficulty", val)} /></View>
              <View className="flex-row gap-4 z-20"><View className="flex-1 mb-6"><AppText variant="subtitle" className="mb-2">Points Awarded</AppText><TextInput className="bg-surface border border-line rounded-lg p-4 font-sans text-ink" value={quest.pointsValue.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("pointsValue", parseInt(txt) || 10)} /></View><View className="flex-1" /></View>
            </View>
          )}

          {activeTab === 'metadata' && (
            <View className="z-50">
              <View className="mb-6 z-50">
                <LocationAutocomplete 
                  label="Location Search" 
                  value={quest.country} 
                  onSelect={(val) => {
                    updateField("country", val); 
                    updateField("locationHint", val); // Automatically syncs with the Hero Pill!
                  }} 
                />
              </View>
              <MultiToggleGroup label="Seasons" options={["Spring", "Summer", "Autumn", "Winter", "All year"]} selected={quest.seasons} onSelect={(val) => updateField("seasons", val)} />
              <MultiToggleGroup label="Accessibility" options={["Walking", "Public Transport", "Driving", "Wheelchair Accessible"]} selected={quest.accessibility} onSelect={(val) => updateField("accessibility", val)} />
              <MultiToggleGroup label="Location Types" options={["City", "Town", "Countryside", "Abroad", "Anywhere"]} selected={quest.locationTypes} onSelect={(val) => updateField("locationTypes", val)} />
            </View>
          )}
        </ScrollView>
      </View>
      )}

      {/* --- RIGHT PANEL: WIDE INLINE EDITOR --- */}
      <View className="flex-1 bg-stone items-center justify-center p-4">
        
        <View className="absolute top-10 flex-row bg-surface rounded-full p-1 border border-line shadow-sm z-50">
          <Pressable onPress={() => setPreviewMode('hero')} className={`px-6 py-2 rounded-full ${previewMode === 'hero' ? 'bg-accent' : 'bg-transparent'}`}><AppText className={previewMode === 'hero' ? 'text-accentText' : 'text-ink/60'}>Card Preview</AppText></Pressable>
          <Pressable onPress={() => setPreviewMode('details')} className={`px-6 py-2 rounded-full ${previewMode === 'details' ? 'bg-accent' : 'bg-transparent'}`}><AppText className={previewMode === 'details' ? 'text-accentText' : 'text-ink/60'}>Details Editor</AppText></Pressable>
        </View>
        <View className="absolute top-10 left-4 bg-surface rounded-full p-2 border border-line shadow-sm z-50">
          <Pressable onPress={() => setLeftPanelVisible(!leftPanelVisible)}>
            <AppText className="font-sansSemi text-ink/70 px-2">{leftPanelVisible ? '◀ Hide Settings' : '▶ Show Settings'}</AppText>
          </Pressable>
        </View>

        <View className={`bg-surface border-[8px] border-white shadow-xl overflow-hidden justify-center transition-all duration-300 ${
          previewMode === 'details' ? 'w-[90%] max-w-[900px] h-[90vh] rounded-[24px]' : 'w-[400px] h-[750px] rounded-[45px] px-4'
        }`}>
          {previewMode === 'hero' ? (
            <QuestHero 
  quest={{ ...quest, stats: { views: 0, inProgress: 0, completed: 1, recentAvatars: ['https://i.pravatar.cc/100?img=32'] } }} 
  onPressOverride={() => setPreviewMode('details')} 
/>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 40 }}>
              
              <View className="mb-8 items-center bg-orange/10 p-4 rounded-xl border border-orange border-dashed">
                <AppText className="text-orange font-sansSemi">✨ True Inline Editor</AppText>
                <AppText className="text-orange/80 text-sm text-center mt-1">
                  Type <AppText className="font-bold">/randomiser</AppText> or <AppText className="font-bold">/location</AppText> directly in your sentence.
                </AppText>
              </View>

              <AppText variant="display" className="mb-6">{quest.title}</AppText>

              {/* GALLERY PREVIEW IN THE BUILDER */}
              {quest.galleryUrls && quest.galleryUrls.filter(Boolean).length > 0 && (
                <View className="mb-8 flex-row gap-2">
                  {quest.galleryUrls.filter(Boolean).map((url, i) => (
                    <Image 
                      key={i} 
                      source={{ uri: url }} 
                      className="flex-1 aspect-square rounded-2xl bg-stone border border-line/10 shadow-sm" 
                      contentFit="cover" 
                    />
                  ))}
                </View>
              )}

              <AppText variant="subtitle" className="mb-2 text-ink/60">Why do it?</AppText>
              <TextInput
                className="bg-surface/40 border border-transparent hover:border-line/30 focus:bg-surface focus:border-line focus:shadow-sm rounded-xl p-4 mb-6 font-sans text-ink text-base"
                multiline scrollEnabled={false} value={quest.whyItMatters} onChangeText={(txt) => updateField("whyItMatters", txt)}
              />

              <View className="my-6 h-px bg-line" />
              <AppText variant="subtitle" className="mb-4">Steps</AppText>

              <View className="gap-2 z-50">
                {(quest.steps?.length ? quest.steps : [""]).map((step, index) => {
                  const { title, text: rawStepText } = extractTitleAndText(step);
                  const parsed = rawStepText.split(WIDGET_REGEX);
                  const matchingWidgets = SLASH_WIDGETS.filter(widget => widget.id.startsWith(slashMenu.query));

                  return (
                    <View key={`step-${index}`} className="group mb-4 z-50">
                      <View className="flex-row items-start min-h-[50px] z-50">
                        
                        {/* Reordering Controls */}
                        <View className="w-10 pt-3 flex-col items-center gap-2 opacity-30 hover:opacity-100">
                          <Pressable onPress={() => { if (index > 0) { const n = [...quest.steps]; [n[index-1], n[index]] = [n[index], n[index-1]]; updateField('steps', n); } }}><AppText className="text-[10px]">▲</AppText></Pressable>
                          <Pressable onPress={() => {
                              const newSteps = [...quest.steps];
                              if (newSteps.length > 1) {
                                  newSteps.splice(index, 1);
                              } else {
                                  newSteps[index] = ""; // Clear it if it's the last remaining step
                              }
                              updateField('steps', newSteps);
                          }}>
                              <AppText className="text-[11px] text-[#E63946] font-bold">✕</AppText>
                          </Pressable>
                          <Pressable onPress={() => { if (index < quest.steps.length - 1) { const n = [...quest.steps]; [n[index+1], n[index]] = [n[index], n[index+1]]; updateField('steps', n); } }}><AppText className="text-[10px]">▼</AppText></Pressable>
                        </View>
                        {/* ✨ NEW: OPTIONAL TITLE FIELD ✨ */}
                        <View className="flex-1 ml-2 bg-surface/40 border border-transparent focus:bg-surface focus:border-line focus:shadow-sm rounded-xl px-4 py-3 z-50">
                        <TextInput
                          className="font-sansSemi text-ink text-sm mb-1 outline-none"
                          style={{ opacity: title ? 1 : 0.4 }}
                          placeholder="Optional Title (e.g., Safety, Vibe)..."
                          value={title}
                          onChangeText={(newTitle) => {
                            const newSteps = [...quest.steps];
                            newSteps[index] = buildStepString(newTitle, rawStepText);
                            updateField('steps', newSteps);
                          }}
                        />
                        {/* Inline Text & Widget Rendering */}
                        <View className="flex-row flex-wrap items-end">
                          {parsed.map((part, chunkIndex) => {
                            
                            const widgetMatch = part.match(/^\[([A-Z_]+):(.*)\]$/);
                            
                            if (widgetMatch) {
                              const widgetType = widgetMatch[1] as WidgetType;
                              const widgetConfig = widgetMatch[2];
                              const widgetDef = WIDGET_REGISTRY[widgetType];

                              if (!widgetDef) return <AppText key={chunkIndex}>{part}</AppText>;

                              // --- VISUAL PREVIEW FOR YOUTUBE ---
                              if (widgetType === 'YOUTUBE') {
                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 bg-stone border border-line rounded-xl overflow-hidden group shadow-sm relative"
                                  >
                                    <View pointerEvents="none">
                                      <YouTubeWidget config={widgetConfig} />
                                    </View>
                                    <View className="absolute top-3 right-3 bg-surface px-3 py-1.5 rounded-full shadow flex-row items-center border border-line opacity-70 group-hover:opacity-100 z-10">
                                        <AppText className="text-xs font-sansSemi mr-1">✏️ Edit Video</AppText>
                                    </View>
                                  </Pressable>
                                );
                              }

                              // --- VISUAL PREVIEW FOR LINKS ---
                              if (widgetType === 'LINK') {
                                const c = parseConfig(widgetConfig);
                                const isInline = c.displayType === 'inline';
                                const isAffiliate = c.isAffiliate === 'true';

                                if (isInline) {
                                  return (
                                    <Pressable 
                                      key={chunkIndex} 
                                      onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                      className="flex-row items-center px-2 py-0.5 rounded-md border border-line bg-surface active:bg-stone shadow-sm mx-1 inline-flex"
                                      style={{ alignSelf: 'flex-start', transform: [{ translateY: 2 }] }}
                                    >
                                      <AppText className="font-sansSemi text-ink text-sm">{c.title || 'Link'}</AppText>
                                      <AppText className="text-blue ml-1 text-[10px]">✏️</AppText>
                                    </Pressable>
                                  );
                                }

                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 rounded-xl p-4 flex-row justify-between items-center group shadow-sm border border-line overflow-hidden relative"
                                    style={{ backgroundColor: c.bgImage ? '#000' : '#fff' }}
                                  >
                                    {!!c.bgImage && (
                                      <Image source={{ uri: c.bgImage }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.5 }} contentFit="cover" />
                                    )}
                                    <View className="flex-1 mr-4 z-10">
                                        <AppText className="font-sansSemi text-base" style={{ color: c.textColor || (c.bgImage ? 'white' : '#1C1A17') }}>{c.title || 'Beautiful Link Title'}</AppText>
                                        
                                        {!!c.desc && <AppText className="text-xs mt-1" style={{ color: c.textColor ? `${c.textColor}CC` : (c.bgImage ? 'rgba(255,255,255,0.8)' : 'rgba(28,26,23,0.6)') }}>{c.desc}</AppText>}
                                        
                                        {/* PREVIEW: AFFILIATE DISCLAIMER */}
                                        {isAffiliate && (
                                          <AppText className="text-[9px] mt-1" style={{ color: c.textColor ? `${c.textColor}80` : (c.bgImage ? 'rgba(255,255,255,0.5)' : 'rgba(28,26,23,0.4)') }}>
                                            (i) we may earn a commission on payments made using this link
                                          </AppText>
                                        )}

                                        <AppText className="text-[10px] mt-1" style={{ color: c.bgImage ? 'rgba(255,255,255,0.6)' : '#3b82f6' }}>{c.url || 'https://...'}</AppText>
                                    </View>
                                    <View className="bg-stone px-3 py-1.5 rounded-full border border-line opacity-50 group-hover:opacity-100 z-10">
                                        <AppText className="text-xs font-sansSemi">✏️ Edit</AppText>
                                    </View>
                                  </Pressable>
                                );
                              }
                              // --- VISUAL PREVIEW FOR CHECKLIST ---
                              if (widgetType === 'CHECKLIST') {
                                const c = parseConfig(widgetConfig);
                                const items = (c.items || '').split(',').map(s => s.trim()).filter(Boolean);
                                
                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 rounded-xl p-4 flex-col group shadow-sm border border-line bg-surface relative"
                                  >
                                    {items.length === 0 ? (
                                      <AppText className="text-ink/50 italic py-2">Empty checklist...</AppText>
                                    ) : (
                                      items.map((item, i) => (
                                        <View key={i} className="flex-row items-center py-2 pointer-events-none">
                                          <View className="w-6 h-6 rounded-md border border-line bg-surface mr-3" />
                                          <AppText className="text-base text-ink">{item}</AppText>
                                        </View>
                                      ))
                                    )}
                                    <View className="absolute top-3 right-3 bg-stone px-3 py-1.5 rounded-full border border-line opacity-50 group-hover:opacity-100 z-10">
                                        <AppText className="text-xs font-sansSemi">✏️ Edit</AppText>
                                    </View>
                                  </Pressable>
                                );
                              }
                              // --- VISUAL PREVIEW FOR MAP ---
                              if (widgetType === 'MAP') {
                                const c = parseConfig(widgetConfig);
                                const pinsCount = (c.pins || '').split('|').filter(Boolean).length;
                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 rounded-xl p-4 flex-col group shadow-sm border border-line bg-stone overflow-hidden relative"
                                  >
                                    <View className="flex-row items-center mb-1">
                                      <AppText className="text-2xl mr-2">🗺️</AppText>
                                      <View>
                                        <AppText className="font-sansSemi text-ink">{c.title || 'Interactive Map'}</AppText>
                                        <AppText className="text-ink/60 text-xs">{pinsCount} pinned location(s)</AppText>
                                      </View>
                                    </View>
                                    <View className="absolute top-3 right-3 bg-surface px-3 py-1.5 rounded-full border border-line opacity-70 group-hover:opacity-100 z-10">
                                      <AppText className="text-xs font-sansSemi">✏️ Edit Map</AppText>
                                    </View>
                                  </Pressable>
                                );
                              }
                              // --- VISUAL PREVIEW FOR CARD REVEAL ---
                              if (widgetType === 'CARD_REVEAL') {
                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 group relative"
                                  >
                                    <View pointerEvents="none">
                                      <CardRevealWidget config={widgetConfig} stepIndex={index} chunkIndex={chunkIndex} isBuilder={true} />
                                    </View>
                                    <View className="absolute top-0 right-0 bg-surface px-3 py-1.5 rounded-full shadow flex-row items-center border border-line opacity-70 group-hover:opacity-100 z-10">
                                      <AppText className="text-xs font-sansSemi">✏️ Edit Cards</AppText>
                                    </View>
                                  </Pressable>
                                );
                              }

                              // --- FALLBACK: INLINE PILLS FOR RANDOMISER & LOCATION ---
                              return (
                                 <Pressable
                                  key={chunkIndex}
                                  onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                  className={`flex-row items-center rounded-md px-2 mx-1 mb-1 shadow-sm ${widgetDef.theme.bg} ${widgetDef.theme.border} border ${widgetDef.theme.activeBg}`}
                                  style={{ height: 26 }}
                                >
                                  <AppText className={`${widgetDef.theme.text} font-sansSemi text-[13px]`}>
                                    {widgetDef.icon} {widgetDef.label}
                                  </AppText>
                                  <AppText className={`${widgetDef.theme.text} ml-1 text-[10px] opacity-60`}>✏️</AppText>
                                </Pressable>
                              );
                            }

                            // --- ✨ FIXED TEXT INPUT ---
                            return (
                              <View 
                                key={chunkIndex} 
                                className="relative justify-start shrink" 
                                style={{ 
                                    minWidth: 20, 
                                    minHeight: 28, 
                                    maxWidth: '100%',
                                    flex: (chunkIndex === parsed.length - 1 && !part.includes('\n')) ? 1 : undefined,
                                    width: part.includes('\n') ? '100%' : undefined
                                }}
                              >
                                <AppText 
                                  className="opacity-0 font-sans text-base py-1" 
                                  style={{ 
                                      minWidth: 15, 
                                      pointerEvents: 'none',
                                      whiteSpace: 'pre-wrap', 
                                      textAlign: 'left'
                                  } as any}
                                >
                                  {part + ' '} 
                                </AppText>
                                
                                <TextInput
                                  className="absolute inset-0 font-sans text-ink text-base py-1 outline-none"
                                  style={{ textAlign: 'left', textAlignVertical: 'top' }}
                                  multiline
                                  value={part}
                                  placeholder={chunkIndex === 0 && parsed.length === 1 ? "Enter a step..." : ""}
                                  onChangeText={(txt) => {
                                      // ✨ Auto-format bullet points: 
                                      // Replace "- " or "* " at the start of any line with an indented bullet
                                      const formattedTxt = txt.replace(/^[-*]\s/gm, '  • ');
                                      
                                      chunkTextsRef.current[`${index}-${chunkIndex}`] = formattedTxt;
                                      const newParts = [...parsed];
                                      newParts[chunkIndex] = formattedTxt;
                                      const newRawText = newParts.join('');
                                      const newSteps = [...quest.steps];
                                      newSteps[index] = buildStepString(title, newRawText);
                                      updateField('steps', newSteps);
                                  }}
                                  onSelectionChange={(e) => {
                                      // 1. Save the current selection highlight
                                      selectionRef.current[`${index}-${chunkIndex}`] = e.nativeEvent.selection;
                                      
                                      const cursor = e.nativeEvent.selection.start;
                                      const currentTxt = chunkTextsRef.current[`${index}-${chunkIndex}`] ?? part;
                                      const textUpToCursor = currentTxt.substring(0, cursor);
                                      const match = textUpToCursor.match(/(^|\s|\n)\/([a-z]*)$/i);
                                      
                                      if (match) {
                                          setSlashMenu({ visible: true, query: match[2].toLowerCase(), stepIndex: index, chunkIndex, cursor });
                                      } else {
                                          setSlashMenu(prev => prev.visible ? { ...prev, visible: false, query: "", stepIndex: -1, chunkIndex: -1, cursor: -1 } : prev);
                                      }
                                  }}
                                  // 2. We use a web-specific event handler to catch CMD+B / CMD+U
                                  {...{
                                    onKeyDown: (e: any) => {
                                      if (e.metaKey || e.ctrlKey) {
                                        let wrapper = "";
                                        let isColor = false;
                                        
                                        if (e.key.toLowerCase() === 'b') wrapper = "**";             // CMD+B = Bold
                                        if (e.key.toLowerCase() === 'u') wrapper = "__";             // CMD+U = Underline
                                        if (e.key.toLowerCase() === 'i') wrapper = "_";              // CMD+I = Italic
                                        if (e.key.toLowerCase() === 'k') { wrapper = "!!"; isColor = true; } // CMD+K = Orange Highlight

                                        if (wrapper) {
                                          e.preventDefault(); // Stop browser from opening bookmarks/etc
                                          const currentTxt = chunkTextsRef.current[`${index}-${chunkIndex}`] ?? part;
                                          const sel = selectionRef.current[`${index}-${chunkIndex}`] || { start: currentTxt.length, end: currentTxt.length };
                                          
                                          const before = currentTxt.substring(0, sel.start);
                                          const selected = sel.start !== sel.end ? currentTxt.substring(sel.start, sel.end) : "text";
                                          const after = currentTxt.substring(sel.end);
                                          
                                          // Wrap the text. e.g., **selected** or !!selected!!
                                          const newTxt = before + wrapper + selected + wrapper + after;
                                          
                                          chunkTextsRef.current[`${index}-${chunkIndex}`] = newTxt;
                                          const newParts = [...parsed];
                                          newParts[chunkIndex] = newTxt;
                                          const newRawText = newParts.join('');
                                          const newSteps = [...quest.steps];
                                          newSteps[index] = buildStepString(title, newRawText);
                                          updateField('steps', newSteps);
                                        }
                                      }
                                    }
                                  }}
                                  onKeyPress={(e: any) => {
    
                                    if (e.nativeEvent.key === "Enter") {
                                        if (e.nativeEvent.shiftKey) {
                                            // ✨ Auto-continue bullet list on Shift+Enter
                                            const currentTxt = chunkTextsRef.current[`${index}-${chunkIndex}`] ?? part;
                                            const sel = selectionRef.current[`${index}-${chunkIndex}`] || { start: currentTxt.length, end: currentTxt.length };
                                            
                                            const textUpToCursor = currentTxt.substring(0, sel.start);
                                            const lines = textUpToCursor.split('\n');
                                            const lastLine = lines[lines.length - 1];
                                            
                                            // Check if the current line starts with a bullet point
                                            const bulletMatch = lastLine.match(/^(\s*•\s+)/);
                                            
                                            if (bulletMatch) {
                                                if (e.preventDefault) e.preventDefault();
                                                const bulletPrefix = bulletMatch[1];
                                                
                                                if (lastLine.trim() === '•') {
                                                    // If empty bullet, delete it to exit the list
                                                    const newUpToCursor = textUpToCursor.substring(0, textUpToCursor.length - bulletPrefix.length);
                                                    const textAfterCursor = currentTxt.substring(sel.end);
                                                    const newTxt = newUpToCursor + '\n' + textAfterCursor;
                                                    
                                                    chunkTextsRef.current[`${index}-${chunkIndex}`] = newTxt;
                                                    const newParts = [...parsed];
                                                    newParts[chunkIndex] = newTxt;
                                                    const newRawText = newParts.join('');
                                                    const newSteps = [...quest.steps];
                                                    newSteps[index] = buildStepString(title, newRawText);
                                                    updateField('steps', newSteps);
                                                } else {
                                                    // Continue list with same indentation
                                                    const textAfterCursor = currentTxt.substring(sel.end);
                                                    const newTxt = textUpToCursor + '\n' + bulletPrefix + textAfterCursor;
                                                    
                                                    chunkTextsRef.current[`${index}-${chunkIndex}`] = newTxt;
                                                    const newParts = [...parsed];
                                                    newParts[chunkIndex] = newTxt;
                                                    const newRawText = newParts.join('');
                                                    const newSteps = [...quest.steps];
                                                    newSteps[index] = buildStepString(title, newRawText);
                                                    updateField('steps', newSteps);
                                                }
                                                return;
                                            }
                                            return; 
                                        }
                                        
                                        if (e.preventDefault) e.preventDefault(); 
                                        
                                        if (slashMenu.visible && matchingWidgets.length > 0) {
                                            const widget = matchingWidgets[0];
                                            const currentTxt = chunkTextsRef.current[`${index}-${chunkIndex}`] ?? part;
                                            
                                            const textUpToCursor = currentTxt.substring(0, slashMenu.cursor);
                                            const textAfterCursor = currentTxt.substring(slashMenu.cursor);
                                            const updatedUpToCursor = textUpToCursor.replace(/(^|\s|\n)\/[a-z]*$/i, `$1[${widget.type}:]`); 
                                            
                                            const newParts = [...parsed];
                                            newParts[chunkIndex] = updatedUpToCursor + textAfterCursor;
                                            const newRawText = newParts.join('');
                                            const newSteps = [...quest.steps];
                                            newSteps[index] = buildStepString(title, newRawText);
                                            updateField('steps', newSteps);
                                            setSlashMenu({ visible: false, query: "", stepIndex: -1, chunkIndex: -1, cursor: -1 });
                                        } else {
                                            const newSteps = [...quest.steps];
                                            newSteps.splice(index + 1, 0, "");
                                            updateField('steps', newSteps);
                                        }
                                        return;
                                    }
                                    if (e.nativeEvent.key === 'Backspace' && part === '') {
                                      if (chunkIndex > 0) {
                                        const newParts = [...parsed];
                                        newParts.splice(chunkIndex - 1, 2); 
                                        const newRawText = newParts.join('');
                                        const newSteps = [...quest.steps];
                                        newSteps[index] = buildStepString(title, newRawText);
                                        updateField('steps', newSteps);
                                      } else if (quest.steps.length > 1 && parsed.length === 1) {
                                        const newSteps = [...quest.steps];
                                        newSteps.splice(index, 1);
                                        updateField('steps', newSteps);
                                      }
                                    }
                                  }}
                                />

                                {/* SLASH MENU */}
                                {slashMenu.visible && slashMenu.stepIndex === index && slashMenu.chunkIndex === chunkIndex && (
                                  <View className="absolute left-0 top-full mt-2 bg-surface rounded-xl border border-line shadow-lg w-72 z-50 overflow-hidden">
                                    {matchingWidgets.map(widget => (
                                      <Pressable
                                        key={widget.id}
                                        className="px-4 py-3 hover:bg-stone flex-row items-center gap-3"
                                        onPress={() => {
                                          const currentTxt = chunkTextsRef.current[`${index}-${chunkIndex}`] ?? part;
                                            
                                          const textUpToCursor = currentTxt.substring(0, slashMenu.cursor);
                                          const textAfterCursor = currentTxt.substring(slashMenu.cursor);
                                          const updatedUpToCursor = textUpToCursor.replace(/(^|\s|\n)\/[a-z]*$/i, `$1[${widget.type}:]`);
                                          
                                          const newParts = [...parsed];
                                          newParts[chunkIndex] = updatedUpToCursor + textAfterCursor;
                                          const newRawText = newParts.join("");
                                          const newSteps = [...quest.steps];
                                          newSteps[index] = buildStepString(title, newRawText);
                                          updateField("steps", newSteps);
                                          setSlashMenu({ visible: false, query: "", stepIndex: -1, chunkIndex: -1, cursor: -1 });
                                        }}
                                      >
                                        <AppText>{widget.icon}</AppText>
                                        <AppText>
                                          <AppText className="font-sansSemi">{widget.label.slice(0, slashMenu.query.length)}</AppText>
                                          {widget.label.slice(slashMenu.query.length)}
                                        </AppText>
                                      </Pressable>
                                    ))}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* DYNAMIC INLINE CONFIG POPUP */}
                      {activeWidgetConfig?.stepIndex === index && (
                        <View className={`ml-12 mt-2 border p-4 rounded-xl shadow-sm mb-2 max-w-[400px] z-[90] ${WIDGET_REGISTRY[activeWidgetConfig.type].theme.containerBg} ${WIDGET_REGISTRY[activeWidgetConfig.type].theme.containerBorder}`}>
                          <View className="flex-row justify-between items-center mb-3">
                            <AppText className={`${WIDGET_REGISTRY[activeWidgetConfig.type].theme.text} font-sansSemi text-sm`}>
                              {WIDGET_REGISTRY[activeWidgetConfig.type].icon} Edit {WIDGET_REGISTRY[activeWidgetConfig.type].label}
                            </AppText>
                            <Pressable onPress={() => setActiveWidgetConfig(null)}><AppText className="text-ink/40">✕</AppText></Pressable>
                          </View>
                          
                          {/* RANDOMISER UI */}
                          {activeWidgetConfig.type === 'RANDOMISER' && (() => {
                            // Support legacy simple string (e.g. "Pizza, Burgers") so old quests don't break
                            const isLegacy = activeWidgetConfig.config && !activeWidgetConfig.config.includes('=');
                            const currentCfg = isLegacy 
                                ? { type: 'static', options: activeWidgetConfig.config } 
                                : parseConfig(activeWidgetConfig.config);
                            
                            const sourceType = currentCfg.type || 'static';
                            const options = currentCfg.options || '';
                            const ref = currentCfg.ref || '';
                            const isExposed = currentCfg.isExposed === 'true';
                            const variableName = currentCfg.variableName || '';

                            const modifyRandConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[RANDOMISER:${newConfigStr}]`;
                                const newRawText = newParts.join('');
const newSteps = [...quest.steps];
newSteps[index] = buildStepString(title, newRawText);
updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <ToggleGroup 
                                  label="Source Type" 
                                  options={["Static", "Variable"]} 
                                  selected={sourceType === 'variable' ? 'Variable' : 'Static'} 
                                  onSelect={(v) => modifyRandConfig('type', v.toLowerCase())} 
                                />
                                
                                {sourceType === 'variable' ? (
                                  <Dropdown 
                                    label="Select Variable to Read" 
                                    value={ref || exposedVariables[0]} 
                                    options={exposedVariables} 
                                    onSelect={(v) => modifyRandConfig('ref', v)} 
                                  />
                                ) : (
                                  <TextInput
                                    className="bg-surface p-3 mb-4 rounded-lg border border-line font-sans text-sm outline-none"
                                    placeholder="E.g. Pizza, Burgers, Sushi"
                                    value={options}
                                    onChangeText={(txt) => modifyRandConfig('options', txt)}
                                  />
                                )}

                                <ToggleGroup 
                                  label="Expose Output to Variable?" 
                                  options={["No", "Yes"]} 
                                  selected={isExposed ? 'Yes' : 'No'} 
                                  onSelect={(v) => modifyRandConfig('isExposed', v === 'Yes' ? 'true' : 'false')} 
                                />
                                
                                {isExposed && (
                                  <TextInput
                                    className="bg-surface p-3 rounded-lg border border-line font-sans text-sm outline-none"
                                    placeholder="Variable Name (e.g. $randomChoice_1)"
                                    value={variableName}
                                    onChangeText={(txt) => modifyRandConfig('variableName', txt)}
                                  />
                                )}
                              </View>
                            );
                          })()}

                          {/* LOCATION CONFIG UI */}
                          {activeWidgetConfig.type === 'LOCATION' && (() => {
                            const currentCfg = parseConfig(activeWidgetConfig.config);
                            const q = currentCfg.q || '';
                            const qType = currentCfg.qType || 'static';
                            const center = currentCfg.center || 'current';
                            const lat = currentCfg.lat || '';
                            const lng = currentCfg.lng || '';
                            const rad = currentCfg.rad || '1000';
                            
                            // Extract our new variable exposure configs
                            const isExposed = currentCfg.isExposed === 'true';
                            const variableName = currentCfg.variableName || '';

                            const modifyLocConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[LOCATION:${newConfigStr}]`;
                                const newRawText = newParts.join('');
const newSteps = [...quest.steps];
newSteps[index] = buildStepString(title, newRawText);
updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <ToggleGroup label="Search Input Type" options={["Static", "Variable"]} selected={qType === 'variable' ? 'Variable' : 'Static'} onSelect={(v) => modifyLocConfig('qType', v.toLowerCase())} />
                                
                                {qType === 'variable' ? (
                                  <Dropdown 
                                    label="Map to Variable" 
                                    value={q || exposedVariables[0]} 
                                    options={exposedVariables} 
                                    onSelect={(v) => modifyLocConfig('q', v)} 
                                  />
                                ) : (
                                  <TextInput
                                    className="bg-surface p-3 mb-4 rounded-lg border border-line font-sans text-sm outline-none"
                                    placeholder="Search string (e.g. Cafe)"
                                    value={q}
                                    onChangeText={(txt) => modifyLocConfig('q', txt)}
                                  />
                                )}

                                <ToggleGroup label="Center Point" options={["Current Location", "Fixed Point"]} selected={center === 'fixed' ? 'Fixed Point' : 'Current Location'} onSelect={(v) => modifyLocConfig('center', v === 'Fixed Point' ? 'fixed' : 'current')} />
                                
                                {center === 'fixed' && (
                                  <View className="flex-row gap-3 mb-4">
                                    <TextInput className="flex-1 bg-surface p-3 rounded-lg border border-line font-sans text-sm" placeholder="Latitude" value={lat} onChangeText={(txt) => modifyLocConfig('lat', txt)} keyboardType="numeric" />
                                    <TextInput className="flex-1 bg-surface p-3 rounded-lg border border-line font-sans text-sm" placeholder="Longitude" value={lng} onChangeText={(txt) => modifyLocConfig('lng', txt)} keyboardType="numeric" />
                                  </View>
                                )}

                                <AppText variant="subtitle" className="mb-2 text-xs mt-2">Search Radius (Meters)</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-4 rounded-lg border border-line font-sans text-sm outline-none w-1/2"
                                  placeholder="E.g. 500"
                                  value={rad}
                                  keyboardType="number-pad"
                                  onChangeText={(txt) => modifyLocConfig('rad', txt)}
                                />

                                {/* NEW: EXPOSE OUTPUT TOGGLES */}
                                <ToggleGroup label="Expose Output to Variable?" options={["No", "Yes"]} selected={isExposed ? 'Yes' : 'No'} onSelect={(v) => modifyLocConfig('isExposed', v === 'Yes' ? 'true' : 'false')} />
                                
                                {isExposed && (
                                  <TextInput
                                    className="bg-surface p-3 rounded-lg border border-line font-sans text-sm outline-none"
                                    placeholder="Variable Name (e.g. $found_locations)"
                                    value={variableName}
                                    onChangeText={(txt) => modifyLocConfig('variableName', txt)}
                                  />
                                )}
                              </View>
                            );
                          })()}

                          {/* YOUTUBE CONFIG UI */}
                          {activeWidgetConfig.type === 'YOUTUBE' && (() => {
                            // Use safe parsing locally so the builder doesn't crash on HTML strings
                            const parseLocalConfig = (str: string) => {
                              const obj: Record<string, string> = {};
                              str.split('&').forEach(pair => {
                                const equalIdx = pair.indexOf('=');
                                if (equalIdx > -1) {
                                  const k = pair.slice(0, equalIdx);
                                  const v = pair.slice(equalIdx + 1);
                                  try { if (k) obj[k] = decodeURIComponent(v || ''); } catch(e) {}
                                }
                              });
                              return obj;
                            };

                            const currentCfg = parseLocalConfig(activeWidgetConfig.config);
                            
                            const modifyConfig = (val: string) => {
                                const newConfigStr = `rawEmbed=${encodeURIComponent(val)}`;
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[YOUTUBE:${newConfigStr}]`;
                                const newRawText = newParts.join('');
const newSteps = [...quest.steps];
newSteps[index] = buildStepString(title, newRawText);
updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <AppText className="text-xs mb-1">Paste Raw YouTube Embed Code</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder='<iframe width="560" height="315" src="..." ...></iframe>'
                                  value={currentCfg.rawEmbed || ''}
                                  onChangeText={modifyConfig}
                                  multiline
                                  style={{ minHeight: 120, textAlignVertical: 'top' }}
                                />
                              </View>
                            );
                          })()}

                          {/* LINK CONFIG UI */}
                          {activeWidgetConfig.type === 'LINK' && (() => {
                            const currentCfg = parseConfig(activeWidgetConfig.config);
                            const isAffiliate = currentCfg.isAffiliate === 'true';
                            
                            const modifyConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[LINK:${newConfigStr}]`;
                                const newRawText = newParts.join('');
                                const newSteps = [...quest.steps];
                                newSteps[index] = buildStepString(title, newRawText);
                                updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <ToggleGroup
                                  label="Display Type"
                                  options={["Inline", "Block"]}
                                  selected={currentCfg.displayType === 'inline' ? 'Inline' : 'Block'}
                                  onSelect={(v) => modifyConfig('displayType', v.toLowerCase())}
                                />
                                
                                {/* AFFILIATE TOGGLE (Only show if Block type) */}
                                {currentCfg.displayType !== 'inline' && (
                                  <ToggleGroup
                                    label="Affiliate Link?"
                                    options={["No", "Yes"]}
                                    selected={isAffiliate ? 'Yes' : 'No'}
                                    onSelect={(v) => modifyConfig('isAffiliate', v === 'Yes' ? 'true' : 'false')}
                                  />
                                )}

                                <AppText className="text-xs mb-1">Destination URL</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="https://..."
                                  value={currentCfg.url || ''}
                                  onChangeText={(txt) => modifyConfig('url', txt)}
                                />
                                <AppText className="text-xs mb-1">Display Title</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="e.g. Read the Menu"
                                  value={currentCfg.title || ''}
                                  onChangeText={(txt) => modifyConfig('title', txt)}
                                />
                                
                                {currentCfg.displayType !== 'inline' && (
                                  <>
                                    <AppText className="text-xs mb-1">Description (Optional)</AppText>
                                    <TextInput
                                      className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                      placeholder="e.g. Vegan options available"
                                      value={currentCfg.desc || ''}
                                      onChangeText={(txt) => modifyConfig('desc', txt)}
                                    />
                                    <AppText className="text-xs mb-1 mt-2">Background Image URL (Optional)</AppText>
                                    <TextInput
                                      className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                      placeholder="https://..."
                                      value={currentCfg.bgImage || ''}
                                      onChangeText={(txt) => modifyConfig('bgImage', txt)}
                                    />
                                    <AppText className="text-xs mb-1 mt-2">Text Color (Hex/Name, Optional)</AppText>
                                    <TextInput
                                      className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                      placeholder="e.g. #FFFFFF"
                                      value={currentCfg.textColor || ''}
                                      onChangeText={(txt) => modifyConfig('textColor', txt)}
                                    />
                                  </>
                                )}
                              </View>
                            );
                          })()}

                          {/* CHECKLIST UI */}
                          {activeWidgetConfig.type === 'CHECKLIST' && (() => {
                            const currentCfg = parseConfig(activeWidgetConfig.config);
                            // Extract items, falling back if it's an old string
                            const items = currentCfg.items !== undefined ? currentCfg.items : activeWidgetConfig.config.replace('items=', '');
                            const isRequired = currentCfg.isRequired === 'true';
                            
                            const modifyConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, items, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[CHECKLIST:${newConfigStr}]`;
                                const newRawText = newParts.join('');
                                const newSteps = [...quest.steps];
                                newSteps[index] = buildStepString(title, newRawText);
                                updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <ToggleGroup 
                                  label="Required to Complete Step?" 
                                  options={["No", "Yes"]} 
                                  selected={isRequired ? 'Yes' : 'No'} 
                                  onSelect={(v) => modifyConfig('isRequired', v === 'Yes' ? 'true' : 'false')} 
                                />
                                <AppText className="text-xs mb-1">Checklist Items (Comma separated)</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="E.g. Pack water, Check map"
                                  value={decodeURIComponent(items)}
                                  onChangeText={(txt) => modifyConfig('items', txt)}
                                />
                              </View>
                            );
                          })()}

                          {/* MAP CONFIG UI */}
                          {activeWidgetConfig.type === 'MAP' && (() => {
                            const currentCfg = parseConfig(activeWidgetConfig.config);
                            const pins = (currentCfg.pins || '').split('|').filter(Boolean);
                            
                            const modifyConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[MAP:${newConfigStr}]`;
                                const newRawText = newParts.join('');
                                const newSteps = [...quest.steps];
                                newSteps[index] = buildStepString(title, newRawText);
                                updateField('steps', newSteps);
                            };

                            const addPin = () => {
                                const newPins = [...pins, '51.5074,-0.1278,New Location'];
                                modifyConfig('pins', newPins.join('|'));
                            };

                            const updatePin = (i: number, val: string) => {
                                const newPins = [...pins];
                                newPins[i] = val;
                                modifyConfig('pins', newPins.join('|'));
                            };

                            const removePin = (i: number) => {
                                const newPins = pins.filter((_, idx) => idx !== i);
                                modifyConfig('pins', newPins.join('|'));
                            };

                            return (
                              <View className="flex-col gap-2 w-full">
                                <AppText className="text-xs mb-1">Map Title</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="E.g. Route Overview"
                                  value={currentCfg.title || ''}
                                  onChangeText={(txt) => modifyConfig('title', txt)}
                                />

                                <View className="flex-row justify-between items-center mt-2 mb-1">
                                  <AppText className="text-xs">Pins</AppText>
                                  <Pressable onPress={addPin}><AppText className="text-blue text-xs font-sansSemi">+ Add Pin</AppText></Pressable>
                                </View>

                                <ScrollView className="max-h-[250px] w-full" nestedScrollEnabled>
                                  {pins.map((pinStr, i) => {
                                    const [lat, lng, ...titleParts] = pinStr.split(',');
                                    const pinTitle = titleParts.join(',');
                                    return (
                                      <View key={i} className="flex-col gap-1 mb-3 p-3 bg-surface rounded-lg border border-line">
                                        <View className="flex-row justify-between items-center mb-1">
                                          <AppText className="text-[10px] text-ink/50 uppercase font-sansSemi">Pin {i+1}</AppText>
                                          <Pressable onPress={() => removePin(i)}><AppText className="text-red-500 text-[10px] font-sansSemi">Remove</AppText></Pressable>
                                        </View>
                                        <TextInput
                                          className="bg-stone p-2 rounded border border-line font-sans text-xs outline-none"
                                          placeholder="Title (e.g. The Red Lion)"
                                          value={pinTitle}
                                          onChangeText={(txt) => updatePin(i, `${lat},${lng},${txt}`)}
                                        />
                                        <View className="flex-row gap-2 mt-1">
                                          <TextInput
                                            className="flex-1 bg-stone p-2 rounded border border-line font-sans text-xs outline-none"
                                            placeholder="Latitude"
                                            value={lat}
                                            onChangeText={(txt) => updatePin(i, `${txt},${lng},${pinTitle}`)}
                                          />
                                          <TextInput
                                            className="flex-1 bg-stone p-2 rounded border border-line font-sans text-xs outline-none"
                                            placeholder="Longitude"
                                            value={lng}
                                            onChangeText={(txt) => updatePin(i, `${lat},${txt},${pinTitle}`)}
                                          />
                                        </View>
                                      </View>
                                    );
                                  })}
                                </ScrollView>
                              </View>
                            );
                          })()}
                          {/* CARD REVEAL UI */}
                          {activeWidgetConfig.type === 'CARD_REVEAL' && (() => {
                            const currentCfg = parseConfig(activeWidgetConfig.config);
                            const cardCount = currentCfg.cardCount || '3';
                            let entries: any[] = [];
                            try { entries = JSON.parse(currentCfg.entries || '[]'); } catch (e) {}

                            const modifyConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = rawStepText.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[CARD_REVEAL:${newConfigStr}]`;
                                const newRawText = newParts.join('');
                                const newSteps = [...quest.steps];
                                newSteps[index] = buildStepString(title, newRawText);
                                updateField('steps', newSteps);
                            };

                            const addEntry = () => {
                                const newEntries = [...entries, { title: 'New Mini Quest', bgColor: '#303030', bgImage: '' }];
                                modifyConfig('entries', JSON.stringify(newEntries));
                            };
                            const updateEntry = (i: number, field: string, val: string) => {
                                const newEntries = [...entries];
                                newEntries[i][field] = val;
                                modifyConfig('entries', JSON.stringify(newEntries));
                            };
                            const removeEntry = (i: number) => {
                                const newEntries = entries.filter((_, idx) => idx !== i);
                                modifyConfig('entries', JSON.stringify(newEntries));
                            };

                            return (
                              <View className="flex-col gap-2 w-full">
                                <AppText className="text-xs mb-1">Number of Cards on Screen</AppText>
                                <TextInput
                                  className="bg-surface p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  value={cardCount}
                                  keyboardType="number-pad"
                                  onChangeText={(txt) => modifyConfig('cardCount', txt)}
                                />

                                <View className="flex-row justify-between items-center mt-2 mb-1">
                                  <AppText className="text-xs">Randomised Entry List</AppText>
                                  <Pressable onPress={addEntry}><AppText className="text-purple-600 text-xs font-sansSemi">+ Add Entry</AppText></Pressable>
                                </View>

                                <ScrollView className="max-h-[300px] w-full" nestedScrollEnabled>
                                  {entries.map((entry, i) => (
                                    <View key={i} className="flex-col gap-1 mb-3 p-3 bg-surface rounded-lg border border-line">
                                      <View className="flex-row justify-between items-center mb-2">
                                        <AppText className="text-[10px] text-ink/50 uppercase font-sansSemi">Entry {i+1}</AppText>
                                        <Pressable onPress={() => removeEntry(i)}><AppText className="text-red-500 text-[10px] font-sansSemi">Remove</AppText></Pressable>
                                      </View>
                                      <TextInput className="bg-stone p-2 rounded border border-line font-sans text-xs mb-2 outline-none" placeholder="Task (e.g. Make them laugh)" value={entry.title} onChangeText={(txt) => updateEntry(i, 'title', txt)} />
                                      <View className="flex-row gap-2 mb-2">
                                          <TextInput className="flex-1 bg-stone p-2 rounded border border-line font-sans text-xs outline-none" placeholder="Bg Hex (e.g. #FF0000)" value={entry.bgColor} onChangeText={(txt) => updateEntry(i, 'bgColor', txt)} />
                                      </View>
                                      <TextInput className="bg-stone p-2 rounded border border-line font-sans text-xs outline-none" placeholder="Bg Image URL (Optional)" value={entry.bgImage} onChangeText={(txt) => updateEntry(i, 'bgImage', txt)} />
                                    </View>
                                  ))}
                                </ScrollView>
                              </View>
                            );
                          })()}

                        </View>
                      )}

                    </View>
                    </View>
                  );
                })}
              </View>

              <View className="my-8 h-px bg-line" />
              <AppText variant="subtitle" className="mb-2 text-ink/60">Journal Prompt</AppText>
              <TextInput
                className="bg-surface/40 border border-transparent hover:border-line/30 focus:bg-surface focus:border-line focus:shadow-sm rounded-xl p-4 mb-6 font-sans text-ink text-base"
                value={quest.journalPrompt} onChangeText={(txt) => updateField("journalPrompt", txt)}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
