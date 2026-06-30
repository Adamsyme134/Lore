// app/admin/quest-builder.tsx
import { useState, useEffect } from "react";
import { View, ScrollView, TextInput, Pressable } from "react-native";
import { AppText } from "../../src/shared/components/AppText";
import { QuestHero } from "../../src/features/quests/components/QuestHero";
import { QuestCard } from "../../src/features/quests/components/QuestCard";
import type { 
  Quest, 
  QuestCategory, 
  QuestCost, 
  QuestLength, 
  QuestDifficulty, 
  QuestSeason, 
  QuestAccessibility, 
  QuestLocationType 
} from "../../src/shared/types/domain";
import { requireSupabase } from "../../src/lib/supabase";

const CATEGORIES: (QuestCategory | "All")[] = ["All", "Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"];
// -- WIDGETS SETUP -- //
type WidgetType = 'RANDOMISER' | 'LOCATION' | 'YOUTUBE' | 'LINK';
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
    label: "Location Drop",
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
  }
};

const SLASH_WIDGETS = Object.entries(WIDGET_REGISTRY).map(([type, data]) => ({ type, ...data }));
const WIDGET_REGEX = /(\[[A-Z_]+:.*?\])/g;

// Helpers for Config String Serialization (e.g., q=cafe&qType=static)
const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) obj[k] = decodeURIComponent(v || '');
  });
  return obj;
};

const serializeConfig = (obj: Record<string, string>) => {
  return Object.entries(obj)
    .filter(([_, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
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

function Dropdown({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (val: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="flex-1 relative z-50 mb-6">
      {label ? <AppText variant="subtitle" className="mb-2 text-xs">{label}</AppText> : null}
      <Pressable onPress={() => setIsOpen(!isOpen)} className="bg-white border border-line rounded-lg p-3 flex-row justify-between items-center">
        <AppText className="text-ink font-sans">{value || 'Select an option'}</AppText>
        <AppText className="text-ink/50 text-xs">▼</AppText>
      </Pressable>
      {isOpen && (
        <View className="absolute top-full mt-1 left-0 right-0 bg-white border border-line rounded-lg shadow-lg z-[100] max-h-48 overflow-hidden">
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
      <View className="flex-row rounded-lg border border-line overflow-hidden bg-white">
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <Pressable key={opt} onPress={() => onSelect(opt)} className={`flex-1 p-2 items-center justify-center ${isActive ? 'bg-ink' : 'bg-transparent'}`}>
              <AppText className={isActive ? 'text-ivory font-sansSemi text-xs' : 'text-ink text-xs'}>{opt}</AppText>
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
              className={`px-4 py-2 rounded-full border ${isActive ? 'bg-ink border-ink' : 'bg-white border-line shadow-sm'}`}
            >
              <AppText className={isActive ? 'text-ivory font-sansSemi' : 'text-ink'}>{opt}</AppText>
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
  imagePosition: "center",
  categories: ["Adventure"],
  cost: "Free" as QuestCost,
  length: "Half day" as QuestLength,
  difficulty: "Medium" as QuestDifficulty,
  minParticipants: 1,
  maxParticipants: 1,
  seasons: ["All year"] as QuestSeason[],
  accessibility: [] as QuestAccessibility[],
  locationTypes: ["Anywhere"] as QuestLocationType[]
});

export default function QuestBuilderAdmin() {
  const [view, setView] = useState<'grid' | 'editor'>('grid');
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'tags' | 'metadata'>('basic');
  const [previewMode, setPreviewMode] = useState<'hero' | 'details'>('hero');
  const [activeWidgetConfig, setActiveWidgetConfig] = useState<{
    stepIndex: number; 
    chunkIndex: number; 
    type: WidgetType; 
    config: string;
  } | null>(null);
  
  const [slashMenu, setSlashMenu] = useState<{
    visible: boolean;
    query: string;
    stepIndex: number;
    chunkIndex: number;
  }>({ visible: false, query: "", stepIndex: -1, chunkIndex: -1 });
  
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "All">("All");
  const [quest, setQuest] = useState<Quest>(createBlankQuest());

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
            categories: (q.categories as QuestCategory[]) || (q.category ? [q.category] : ["Adventure"]),
            cost: (q.cost as QuestCost) || "Free",
            length: (q.length as QuestLength) || "Half day",
            difficulty: (q.difficulty as QuestDifficulty) || "Medium",
            minParticipants: q.min_participants || 1,
            maxParticipants: q.max_participants || 1,
            seasons: (q.seasons as QuestSeason[]) || ["All year"],
            accessibility: (q.accessibility as QuestAccessibility[]) || [],
            locationTypes: (q.location_types as QuestLocationType[]) || ["Anywhere"]
          }));
          setSavedQuests(mappedQuests);
        }
      } catch (error) {
        console.error("Error fetching quests:", error);
      }
    };
    fetchQuests();
  }, []);

  const updateField = (field: keyof Quest, value: any) => {
    setQuest((prev) => ({ ...prev, [field]: value }));
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
        categories: quest.categories,
        cost: quest.cost,
        length: quest.length,
        difficulty: quest.difficulty,
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
      const safeCategory = q.category || "Adventure";
      const matchesCategory = activeCategory === "All" || safeCategory === activeCategory;
      return matchesSearch && matchesCategory;
    });
    
    return (
      <View className="flex-1 bg-cream p-10">
        <View className="flex-row justify-between items-center mb-10">
          <AppText variant="display">Quest Library</AppText>
          <Pressable onPress={() => { setQuest(createBlankQuest()); setView('editor'); setPreviewMode('hero'); setActiveTab('basic'); }} className="bg-ink px-6 py-3 rounded-full">
            <AppText className="text-ivory font-sansSemi">+ Create New Quest</AppText>
          </Pressable>
        </View>

        <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink max-w-md" placeholder="Search quests..." value={searchQuery} onChangeText={setSearchQuery} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8 max-h-12" contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-full border ${isActive ? 'bg-ink border-ink' : 'bg-white border-line shadow-sm'}`}>
                <AppText className={isActive ? 'text-ivory font-sansSemi' : 'text-ink'}>{cat}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View className="items-center justify-center p-20 border border-dashed border-line rounded-[24px]">
            <AppText className="text-ink/50 mb-4">No quests found.</AppText>
          </View>
        ) : (
          <ScrollView>
            <View className="flex-row flex-wrap gap-6">
              {filtered.map(q => (
                <View key={q.id} className="w-64">
                  <QuestCard quest={q} />
                  <Pressable onPress={() => { setQuest(q); setView('editor'); setPreviewMode('hero'); setActiveTab('basic'); }} className="mt-2 bg-stone py-2 rounded-lg items-center border border-line">
                    <AppText className="text-ink font-sansSemi">Edit Quest</AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  // Generate available variables to feed to location widget
  const exposedVariables = extractExposedVariables(quest.steps);

  return (
    <View className="flex-1 flex-row bg-cream">
      {/* --- LEFT PANEL: Base Configuration --- */}
      <View className="w-1/3 border-r border-line bg-cream flex-1 max-w-[500px]">
        <View className="p-6 border-b border-line flex-row justify-between items-center bg-white">
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
            <Pressable key={tab} onPress={() => setActiveTab(tab)} className={`flex-1 p-4 items-center ${activeTab === tab ? 'bg-white border-b-2 border-orange' : ''}`}>
              <AppText className={activeTab === tab ? 'text-ink font-sansSemi' : 'text-ink/50 capitalize'}>{tab} Info</AppText>
            </Pressable>
          ))}
        </View>

        <ScrollView className="flex-1 p-8" contentContainerStyle={{ paddingBottom: 100 }}>
          {activeTab === 'basic' && (
            <View>
              <AppText variant="subtitle" className="mb-2">Title</AppText><TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.title} onChangeText={(txt) => updateField("title", txt)} />
              <AppText variant="subtitle" className="mb-2">Kicker (Eyebrow)</AppText><TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.kicker} onChangeText={(txt) => updateField("kicker", txt)} />
              <AppText variant="subtitle" className="mb-2">Description</AppText><TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" multiline numberOfLines={3} value={quest.description} onChangeText={(txt) => updateField("description", txt)} />
              <AppText variant="subtitle" className="mb-2">Image URL</AppText><TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.imageUrl} onChangeText={(txt) => updateField("imageUrl", txt)} />
              <AppText variant="subtitle" className="mb-2">Image Focus</AppText><ToggleGroup label="" options={["top", "center", "bottom"]} selected={quest.imagePosition || "center"} onSelect={(val) => updateField("imagePosition", val)} />
            </View>
          )}

          {activeTab === 'tags' && (
            <View className="z-50">
              <ToggleGroup label="Solo or Group?" options={["Solo", "Group"]} selected={quest.maxParticipants > 1 ? "Group" : "Solo"} onSelect={(val) => { if (val === 'Solo') updateField("maxParticipants", 1); if (val === 'Group') updateField("maxParticipants", 5); }} />
              {quest.maxParticipants > 1 && (
                <View className="flex-row gap-4 mb-6 bg-stone p-4 rounded-lg">
                  <View className="flex-1"><AppText className="text-xs mb-1">Min Size</AppText><TextInput className="bg-white border border-line rounded p-2" value={quest.minParticipants.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("minParticipants", parseInt(txt) || 2)} /></View>
                  <View className="flex-1"><AppText className="text-xs mb-1">Max Size</AppText><TextInput className="bg-white border border-line rounded p-2" value={quest.maxParticipants.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("maxParticipants", parseInt(txt) || 5)} /></View>
                </View>
              )}
              <View className="flex-row gap-4 z-40"><MultiToggleGroup label="Categories" options={["Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"]} selected={quest.categories} onSelect={(val) => updateField("categories", val)} /></View>
              <View className="mb-6 z-40"><Dropdown label="Cost" value={quest.cost} options={["Free", "£", "££", "£££"]} onSelect={(val) => updateField("cost", val)} /></View>
              <View className="flex-row gap-4 z-30"><Dropdown label="Length" value={quest.length} options={["A few hours", "Full day", "Multi-day", "Long-term"]} onSelect={(val) => updateField("length", val)} /><Dropdown label="Difficulty" value={quest.difficulty} options={["Easy", "Medium", "Challenging"]} onSelect={(val) => updateField("difficulty", val)} /></View>
              <View className="flex-row gap-4 z-20"><View className="flex-1 mb-6"><AppText variant="subtitle" className="mb-2">Points Awarded</AppText><TextInput className="bg-white border border-line rounded-lg p-4 font-sans text-ink" value={quest.pointsValue.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("pointsValue", parseInt(txt) || 10)} /></View><View className="flex-1" /></View>
            </View>
          )}

          {activeTab === 'metadata' && (
            <View>
              <MultiToggleGroup label="Seasons" options={["Spring", "Summer", "Autumn", "Winter", "All year"]} selected={quest.seasons} onSelect={(val) => updateField("seasons", val)} />
              <MultiToggleGroup label="Accessibility" options={["Walking", "Public Transport", "Driving", "Wheelchair Accessible"]} selected={quest.accessibility} onSelect={(val) => updateField("accessibility", val)} />
              <MultiToggleGroup label="Location Types" options={["City", "Town", "Countryside", "Abroad", "Anywhere"]} selected={quest.locationTypes} onSelect={(val) => updateField("locationTypes", val)} />
            </View>
          )}
        </ScrollView>
      </View>

      {/* --- RIGHT PANEL: WIDE INLINE EDITOR --- */}
      <View className="flex-1 bg-stone items-center justify-center p-4">
        
        <View className="absolute top-10 flex-row bg-white rounded-full p-1 border border-line shadow-sm z-50">
          <Pressable onPress={() => setPreviewMode('hero')} className={`px-6 py-2 rounded-full ${previewMode === 'hero' ? 'bg-ink' : 'bg-transparent'}`}><AppText className={previewMode === 'hero' ? 'text-ivory' : 'text-ink/60'}>Card Preview</AppText></Pressable>
          <Pressable onPress={() => setPreviewMode('details')} className={`px-6 py-2 rounded-full ${previewMode === 'details' ? 'bg-ink' : 'bg-transparent'}`}><AppText className={previewMode === 'details' ? 'text-ivory' : 'text-ink/60'}>Details Editor</AppText></Pressable>
        </View>

        <View className={`bg-cream border-[8px] border-white shadow-xl overflow-hidden justify-center transition-all duration-300 ${
          previewMode === 'details' ? 'w-[90%] max-w-[900px] h-[90vh] rounded-[24px]' : 'w-[400px] h-[750px] rounded-[45px] px-4'
        }`}>
          {previewMode === 'hero' ? (
            <QuestHero quest={quest} onPressOverride={() => setPreviewMode('details')} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 40 }}>
              
              <View className="mb-8 items-center bg-orange/10 p-4 rounded-xl border border-orange border-dashed">
                <AppText className="text-orange font-sansSemi">✨ True Inline Editor</AppText>
                <AppText className="text-orange/80 text-sm text-center mt-1">
                  Type <AppText className="font-bold">/randomiser</AppText> or <AppText className="font-bold">/location</AppText> directly in your sentence.
                </AppText>
              </View>

              <AppText variant="display" className="mb-6">{quest.title}</AppText>

              <AppText variant="subtitle" className="mb-2 text-ink/60">Why this exists</AppText>
              <TextInput
                className="bg-white/40 border border-transparent hover:border-line/30 focus:bg-white focus:border-line focus:shadow-sm rounded-xl p-4 mb-6 font-sans text-ink text-base"
                multiline scrollEnabled={false} value={quest.whyItMatters} onChangeText={(txt) => updateField("whyItMatters", txt)}
              />

              <View className="my-6 h-px bg-line" />
              <AppText variant="subtitle" className="mb-4">A clean way to do it</AppText>

              <View className="gap-2 z-50">
                {(quest.steps?.length ? quest.steps : [""]).map((step, index) => {
                  
                  const parsed = step.split(WIDGET_REGEX);
                  const matchingWidgets = SLASH_WIDGETS.filter(widget => widget.id.startsWith(slashMenu.query));

                  return (
                    <View key={`step-${index}`} className="group mb-4 z-50">
                      <View className="flex-row items-start min-h-[50px] z-50">
                        
                        {/* Reordering Controls */}
                        <View className="w-10 pt-3 flex-col items-center gap-2 opacity-30 hover:opacity-100">
                          <Pressable onPress={() => { if (index > 0) { const n = [...quest.steps]; [n[index-1], n[index]] = [n[index], n[index-1]]; updateField('steps', n); } }}><AppText className="text-[10px]">▲</AppText></Pressable>
                          <AppText className="text-xs">⋮⋮</AppText>
                          <Pressable onPress={() => { if (index < quest.steps.length - 1) { const n = [...quest.steps]; [n[index+1], n[index]] = [n[index], n[index+1]]; updateField('steps', n); } }}><AppText className="text-[10px]">▼</AppText></Pressable>
                        </View>

                        {/* Inline Text & Widget Rendering */}
                        <View className="flex-1 ml-2 flex-row flex-wrap items-end bg-white/40 border border-transparent focus:bg-white focus:border-line focus:shadow-sm rounded-xl px-4 py-2 min-h-[50px] z-50">
                          {parsed.map((part, chunkIndex) => {
                            
                            const widgetMatch = part.match(/^\[([A-Z_]+):(.*)\]$/);
                            
                            if (widgetMatch) {
                              const widgetType = widgetMatch[1] as WidgetType;
                              const widgetConfig = widgetMatch[2];
                              const widgetDef = WIDGET_REGISTRY[widgetType];

                              if (!widgetDef) return <AppText key={chunkIndex}>{part}</AppText>;

                              // --- ✨ NEW: VISUAL PREVIEW FOR YOUTUBE ---
                              if (widgetType === 'YOUTUBE') {
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
                                const c = parseLocalConfig(widgetConfig);
                                
                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 bg-stone border border-line rounded-xl overflow-hidden group shadow-sm"
                                  >
                                    <View className="h-40 bg-black items-center justify-center relative">
                                        <AppText className="text-white/80 font-sansSemi text-lg">▶ YouTube Video</AppText>
                                        <AppText className="text-white/40 text-xs mt-2 px-6 text-center" numberOfLines={1}>
                                            {c.rawEmbed || 'Click to paste embed code'}
                                        </AppText>
                                    </View>
                                    <View className="absolute top-3 right-3 bg-white px-3 py-1.5 rounded-full shadow flex-row items-center border border-line opacity-70 group-hover:opacity-100">
                                        <AppText className="text-xs font-sansSemi mr-1">✏️ Edit Video</AppText>
                                    </View>
                                  </Pressable>
                                );
                              }

                              // --- ✨ NEW: VISUAL PREVIEW FOR LINKS ---
                              if (widgetType === 'LINK') {
                                const c = parseConfig(widgetConfig);
                                return (
                                  <Pressable 
                                    key={chunkIndex} 
                                    onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, type: widgetType, config: widgetConfig })}
                                    className="w-full my-3 bg-white border border-line rounded-xl p-4 flex-row justify-between items-center group shadow-sm"
                                  >
                                    <View className="flex-1 mr-4">
                                        <AppText className="font-sansSemi text-ink text-base">{c.title || 'Beautiful Link Title'}</AppText>
                                        {c.desc ? <AppText className="text-ink/60 text-sm mt-0.5">{c.desc}</AppText> : null}
                                        <AppText className="text-blue text-xs mt-1">{c.url || 'https://...'}</AppText>
                                    </View>
                                    <View className="bg-stone px-3 py-1.5 rounded-full border border-line opacity-50 group-hover:opacity-100">
                                        <AppText className="text-xs font-sansSemi">✏️ Edit Link</AppText>
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
                              <View key={chunkIndex} className="relative justify-start" style={{ minWidth: 20, minHeight: 28 }}>
                                
                                {/* ✨ FIX: We MUST append a space ' ' to every part. 
                                  Without it, empty strings collapse to 0 height, making new blocks 
                                  and the empty space after a widget literally unclickable! 
                                */}
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
                                  style={{
                                      textAlign: 'left',
                                      textAlignVertical: 'top'
                                  }}
                                  multiline
                                  value={part}
                                  placeholder={chunkIndex === 0 && parsed.length === 1 ? "Enter a step..." : ""}
                                  onChangeText={(txt) => {
                                      const newParts = [...parsed];
                                      newParts[chunkIndex] = txt;
                                      const newSteps = [...quest.steps];
                                      newSteps[index] = newParts.join('');
                                      updateField('steps', newSteps);

                                      const match = txt.match(/\/([a-z]*)$/i);
                                      if (match) {
                                          setSlashMenu({ visible: true, query: match[1].toLowerCase(), stepIndex: index, chunkIndex });
                                      } else {
                                          setSlashMenu(prev => ({ ...prev, visible: false }));
                                      }
                                  }}
                                  onKeyPress={(e: any) => {
                                    if (e.nativeEvent.key === "Enter") {
                                        if (e.nativeEvent.shiftKey) return; 
                                        
                                        if (e.preventDefault) e.preventDefault(); 
                                        
                                        if (slashMenu.visible && matchingWidgets.length > 0) {
                                            const widget = matchingWidgets[0];
                                            const updated = part.replace(/\/[a-z]*$/i, `[${widget.type}:]`); 
                                            const newParts = [...parsed];
                                            newParts[chunkIndex] = updated;
                                            const newSteps = [...quest.steps];
                                            newSteps[index] = newParts.join('');
                                            
                                            updateField("steps", newSteps);
                                        } else {
                                            const newSteps = [...quest.steps];
                                            newSteps.splice(index + 1, 0, "");
                                            updateField('steps', newSteps);
                                        }
                                        setSlashMenu({ visible: false, query: "", stepIndex: -1, chunkIndex: -1 });
                                        return;
                                    }
                                    if (e.nativeEvent.key === 'Backspace' && part === '') {
                                      if (chunkIndex > 0) {
                                        const newParts = [...parsed];
                                        newParts.splice(chunkIndex - 1, 2); 
                                        const newSteps = [...quest.steps];
                                        newSteps[index] = newParts.join('');
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
                                  <View className="absolute left-0 top-full mt-2 bg-white rounded-xl border border-line shadow-lg w-72 z-50 overflow-hidden">
                                    {matchingWidgets.map(widget => (
                                      <Pressable
                                        key={widget.id}
                                        className="px-4 py-3 hover:bg-stone flex-row items-center gap-3"
                                        onPress={() => {
                                          const updated = part.replace(/\/[a-z]*$/i, `[${widget.type}:]`);
                                          const newParts = [...parsed];
                                          newParts[chunkIndex] = updated;
                                          const newSteps = [...quest.steps];
                                          newSteps[index] = newParts.join("");
                                          updateField("steps", newSteps);
                                          setSlashMenu({ visible: false, query: "", stepIndex: -1, chunkIndex: -1 });
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
                                
                                const newParts = step.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[RANDOMISER:${newConfigStr}]`;
                                const newSteps = [...quest.steps];
                                newSteps[index] = newParts.join('');
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
                                    className="bg-white p-3 mb-4 rounded-lg border border-line font-sans text-sm outline-none"
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
                                    className="bg-white p-3 rounded-lg border border-line font-sans text-sm outline-none"
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
                                
                                const newParts = step.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[LOCATION:${newConfigStr}]`;
                                const newSteps = [...quest.steps];
                                newSteps[index] = newParts.join('');
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
                                    className="bg-white p-3 mb-4 rounded-lg border border-line font-sans text-sm outline-none"
                                    placeholder="Search string (e.g. Cafe)"
                                    value={q}
                                    onChangeText={(txt) => modifyLocConfig('q', txt)}
                                  />
                                )}

                                <ToggleGroup label="Center Point" options={["Current Location", "Fixed Point"]} selected={center === 'fixed' ? 'Fixed Point' : 'Current Location'} onSelect={(v) => modifyLocConfig('center', v === 'Fixed Point' ? 'fixed' : 'current')} />
                                
                                {center === 'fixed' && (
                                  <View className="flex-row gap-3 mb-4">
                                    <TextInput className="flex-1 bg-white p-3 rounded-lg border border-line font-sans text-sm" placeholder="Latitude" value={lat} onChangeText={(txt) => modifyLocConfig('lat', txt)} keyboardType="numeric" />
                                    <TextInput className="flex-1 bg-white p-3 rounded-lg border border-line font-sans text-sm" placeholder="Longitude" value={lng} onChangeText={(txt) => modifyLocConfig('lng', txt)} keyboardType="numeric" />
                                  </View>
                                )}

                                <AppText variant="subtitle" className="mb-2 text-xs mt-2">Search Radius (Meters)</AppText>
                                <TextInput
                                  className="bg-white p-3 mb-4 rounded-lg border border-line font-sans text-sm outline-none w-1/2"
                                  placeholder="E.g. 500"
                                  value={rad}
                                  keyboardType="number-pad"
                                  onChangeText={(txt) => modifyLocConfig('rad', txt)}
                                />

                                {/* NEW: EXPOSE OUTPUT TOGGLES */}
                                <ToggleGroup label="Expose Output to Variable?" options={["No", "Yes"]} selected={isExposed ? 'Yes' : 'No'} onSelect={(v) => modifyLocConfig('isExposed', v === 'Yes' ? 'true' : 'false')} />
                                
                                {isExposed && (
                                  <TextInput
                                    className="bg-white p-3 rounded-lg border border-line font-sans text-sm outline-none"
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
                                
                                const newParts = step.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[YOUTUBE:${newConfigStr}]`;
                                const newSteps = [...quest.steps];
                                newSteps[index] = newParts.join('');
                                updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <AppText className="text-xs mb-1">Paste Raw YouTube Embed Code</AppText>
                                <TextInput
                                  className="bg-white p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
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
                            
                            const modifyConfig = (key: string, val: string) => {
                                const nextCfg = { ...currentCfg, [key]: val };
                                const newConfigStr = serializeConfig(nextCfg);
                                setActiveWidgetConfig(prev => prev ? {...prev, config: newConfigStr} : null);
                                
                                const newParts = step.split(WIDGET_REGEX);
                                newParts[activeWidgetConfig!.chunkIndex] = `[LINK:${newConfigStr}]`;
                                const newSteps = [...quest.steps];
                                newSteps[index] = newParts.join('');
                                updateField('steps', newSteps);
                            };

                            return (
                              <View className="flex-col gap-2">
                                <AppText className="text-xs mb-1">Destination URL</AppText>
                                <TextInput
                                  className="bg-white p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="https://..."
                                  value={currentCfg.url || ''}
                                  onChangeText={(txt) => modifyConfig('url', txt)}
                                />
                                <AppText className="text-xs mb-1">Display Title</AppText>
                                <TextInput
                                  className="bg-white p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="e.g. Read the Menu"
                                  value={currentCfg.title || ''}
                                  onChangeText={(txt) => modifyConfig('title', txt)}
                                />
                                <AppText className="text-xs mb-1">Description (Optional)</AppText>
                                <TextInput
                                  className="bg-white p-3 mb-2 rounded-lg border border-line font-sans text-sm outline-none"
                                  placeholder="e.g. Vegan options available"
                                  value={currentCfg.desc || ''}
                                  onChangeText={(txt) => modifyConfig('desc', txt)}
                                />
                              </View>
                            );
                          })()}

                        </View>
                      )}

                    </View>
                  );
                })}
              </View>

              <View className="my-8 h-px bg-line" />
              <AppText variant="subtitle" className="mb-2 text-ink/60">Journal Prompt</AppText>
              <TextInput
                className="bg-white/40 border border-transparent hover:border-line/30 focus:bg-white focus:border-line focus:shadow-sm rounded-xl p-4 mb-6 font-sans text-ink text-base"
                value={quest.journalPrompt} onChangeText={(txt) => updateField("journalPrompt", txt)}
              />
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}