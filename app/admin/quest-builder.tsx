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

// --- CUSTOM UI COMPONENTS FOR ADMIN ---
const CATEGORIES: (QuestCategory | "All")[] = ["All", "Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"];

function Dropdown({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (val: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="flex-1 relative z-50 mb-6">
      <AppText variant="subtitle" className="mb-2">{label}</AppText>
      <Pressable onPress={() => setIsOpen(!isOpen)} className="bg-white border border-line rounded-lg p-4 flex-row justify-between items-center">
        <AppText className="text-ink font-sans">{value}</AppText>
        <AppText className="text-ink/50">▼</AppText>
      </Pressable>
      {isOpen && (
        <View className="absolute top-20 left-0 right-0 bg-white border border-line rounded-lg shadow-lg z-50 max-h-48 overflow-hidden">
          <ScrollView nestedScrollEnabled>
            {options.map((opt) => (
              <Pressable key={opt} onPress={() => { onSelect(opt); setIsOpen(false); }} className="p-4 border-b border-line/50 hover:bg-stone">
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
    <View className="mb-6">
      <AppText variant="subtitle" className="mb-2">{label}</AppText>
      <View className="flex-row rounded-lg border border-line overflow-hidden bg-white">
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <Pressable key={opt} onPress={() => onSelect(opt)} className={`flex-1 p-3 items-center justify-center ${isActive ? 'bg-ink' : 'bg-transparent'}`}>
              <AppText className={isActive ? 'text-ivory font-sansSemi' : 'text-ink'}>{opt}</AppText>
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
  steps: [""], // Start with one empty block
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
  // 🗑️ REMOVED 'inside' TAB ENTIRELY
  const [activeTab, setActiveTab] = useState<'basic' | 'tags' | 'metadata'>('basic');
  const [previewMode, setPreviewMode] = useState<'hero' | 'details'>('hero');
  const [activeWidgetConfig, setActiveWidgetConfig] = useState<{stepIndex: number, chunkIndex: number, options: string} | null>(null);
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
        steps: quest.steps.filter(s => s.trim() !== ""), // Clean up empty blocks
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

  return (
    <View className="flex-1 flex-row bg-cream">
      {/* --- LEFT PANEL: Base Configuration --- */}
      <View className="w-1/3 border-r border-line bg-cream flex-1 max-w-[500px]">
        {/* ... KEEP EXISTING TABS AND METADATA RENDER ... */}
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
                  Type <AppText className="font-bold">/randomiser</AppText> directly in your sentence. It will magically convert into an inline widget.
                </AppText>
              </View>

              <AppText variant="display" className="mb-6">{quest.title}</AppText>

              <AppText variant="subtitle" className="mb-2 text-ink/60">Why this exists</AppText>
              <TextInput
                className="bg-white/40 border border-transparent hover:border-line/30 focus:bg-white focus:border-line focus:shadow-sm rounded-xl p-4 mb-6 font-sans text-ink text-base"
                multiline scrollEnabled={false} value={quest.whyItMatters} onChangeText={(txt) => updateField("whyItMatters", txt)}
              />

              {/* Replace the current 'A clean way to do it' block with this refined inline version */}
<View className="my-6 h-px bg-line" />
<AppText variant="subtitle" className="mb-4">A clean way to do it</AppText>

<View className="gap-2">
  {(quest.steps?.length ? quest.steps : [""]).map((step, index) => {
    
    // Split the text perfectly around the widget tags
    const parsed = step.split(/(\[RANDOMISER:.*?\])/g);

    return (
      <View key={`step-${index}`} className="group mb-4">
        <View className="flex-row items-start min-h-[50px]">
          
          {/* Reordering Controls */}
          <View className="w-10 pt-3 flex-col items-center gap-2 opacity-30 hover:opacity-100">
             <Pressable onPress={() => { if (index > 0) { const n = [...quest.steps]; [n[index-1], n[index]] = [n[index], n[index-1]]; updateField('steps', n); } }}><AppText className="text-[10px]">▲</AppText></Pressable>
             <AppText className="text-xs">⋮⋮</AppText>
             <Pressable onPress={() => { if (index < quest.steps.length - 1) { const n = [...quest.steps]; [n[index+1], n[index]] = [n[index], n[index+1]]; updateField('steps', n); } }}><AppText className="text-[10px]">▼</AppText></Pressable>
          </View>

          {/* ✨ FLAWLESS INLINE EDITOR */}
          <View className="flex-1 ml-2 flex-row flex-wrap items-center bg-white/40 border border-transparent focus:bg-white focus:border-line focus:shadow-sm rounded-xl px-4 py-2 min-h-[50px]">
            {parsed.map((part, chunkIndex) => {
              
              // 1. THE INLINE WIDGET PILL
              if (part.startsWith('[RANDOMISER:')) {
                 const optionsStr = part.replace('[RANDOMISER:', '').replace(']', '');
                 return (
                   <Pressable
                     key={chunkIndex}
                     onPress={() => setActiveWidgetConfig({ stepIndex: index, chunkIndex, options: optionsStr })}
                     className="flex-row items-center bg-orange/10 border border-orange/40 rounded-md px-2 mx-1 shadow-sm active:bg-orange/20"
                     style={{ height: 26, transform: [{ translateY: 1 }] }} // Visually aligns without breaking line box
                   >
                     <AppText className="text-orange font-sansSemi text-[13px]">🎲 {optionsStr || 'Empty'}</AppText>
                     <AppText className="text-orange ml-1 text-[10px] opacity-60">✏️</AppText>
                   </Pressable>
                 );
              }

              // 2. THE GHOST-TEXT AUTO-WIDTH INPUT
              return (
                <View key={chunkIndex} className="relative justify-center">
                  
                  {/* INVISIBLE GHOST TEXT: This dictates the exact width/height needed by hugging the text naturally */}
                  <AppText className="opacity-0 font-sans text-base py-1" style={{ minWidth: 15, pointerEvents: 'none' }}>
                    {part + ' '} {/* The trailing space gives the cursor room to breathe */}
                  </AppText>
                  
                  {/* VISIBLE TEXT INPUT: Stretches perfectly over the ghost text, meaning NO WEIRD GAPS! */}
                  <TextInput
                    className="absolute inset-0 font-sans text-ink text-base py-1 outline-none"
                    multiline
                    value={part}
                    placeholder={chunkIndex === 0 && parsed.length === 1 ? "Type or '/randomiser'..." : ""}
                    onChangeText={(txt) => {
                      const newParts = [...parsed];
                      if (txt.includes('/randomiser')) {
                         newParts[chunkIndex] = txt.replace('/randomiser', '[RANDOMISER:]');
                      } else {
                         newParts[chunkIndex] = txt;
                      }
                      const newSteps = [...quest.steps];
                      newSteps[index] = newParts.join('');
                      updateField('steps', newSteps);
                    }}
                    onKeyPress={(e) => {
                      if (e.nativeEvent.key === 'Enter') {
                        const newSteps = [...quest.steps];
                        newSteps.splice(index + 1, 0, "");
                        updateField('steps', newSteps);
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
                </View>
              );
            })}
          </View>
        </View>

        {/* ... KEEP YOUR EXISTING INLINE CONFIG POPUP HERE ... */}
        {activeWidgetConfig?.stepIndex === index && (
          <View className="ml-12 mt-2 bg-orange/5 border border-orange/30 p-4 rounded-xl shadow-sm mb-2 max-w-[400px]">
             <AppText className="text-orange font-sansSemi text-sm mb-2">🎲 Edit Randomiser Options</AppText>
             <TextInput
               className="bg-white p-3 rounded-lg border border-line font-sans text-sm outline-none"
               placeholder="E.g. Pizza, Burgers, Sushi (comma separated)"
               value={activeWidgetConfig.options}
               autoFocus
               onChangeText={(txt) => {
                 setActiveWidgetConfig(prev => prev ? {...prev, options: txt} : null);
                 const newParts = step.split(/(\[RANDOMISER:.*?\])/g);
                 newParts[activeWidgetConfig!.chunkIndex] = `[RANDOMISER:${txt}]`;
                 const newSteps = [...quest.steps];
                 newSteps[index] = newParts.join('');
                 updateField('steps', newSteps);
               }}
             />
             <Pressable onPress={() => setActiveWidgetConfig(null)} className="mt-3 self-end bg-orange px-5 py-2 rounded-full shadow-sm active:opacity-80">
                <AppText className="text-white text-xs font-sansSemi">Done</AppText>
             </Pressable>
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