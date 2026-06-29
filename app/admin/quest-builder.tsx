// app/admin/quest-builder.tsx
import { useState, useEffect } from "react";
import { View, ScrollView, TextInput, Pressable } from "react-native";
import { AppText } from "../../src/shared/components/AppText";
import { QuestHero } from "../../src/features/quests/components/QuestHero";
import { QuestDetailBlock } from "../../src/features/quests/components/QuestDetailBlock";
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
import { RandomiserWidget } from "src/features/quests/components/widgets/RandomiserWidget";
import { requireSupabase } from "../../src/lib/supabase";

// --- CUSTOM UI COMPONENTS FOR ADMIN ---
const CATEGORIES: (QuestCategory | "All")[] = [
  "All", "Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"
];

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

// ✨ NEW: Multi-Select component for arrays (Metadata)
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

// --- MAIN BUILDER APP ---

const createBlankQuest = (): Quest => ({
  id: `draft-${Date.now()}`,
  slug: `new-quest-${Date.now()}`,
  title: "Untitled Quest",
  kicker: "NEW ADVENTURE",
  description: "Describe the adventure here...",
  whyItMatters: "Explain why they should do this...",
  locationHint: "Anywhere",
  duration: "Half day", // ✨ Added missing property
  mood: "wild",
  accent: "orange",
  imageUrl: "https://images.unsplash.com/photo-1501555088652-021faa106b9b",
  steps: ["Step 1..."],
  contentBlocks: [
    { type: "text", id: `block-${Date.now()}-1`, content: "Welcome to this new quest. What will you discover?" }
  ] as any, // Cast to any to satisfy strict compiler locally
  journalPrompt: "What did you learn?",
  pointsValue: 15,
  imagePosition: "center",

  
  // ✨ Fix: Tell TS exactly what types these defaults are
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
  // ✨ NEW: Added 'metadata' to the tabs
  const [activeTab, setActiveTab] = useState<'basic' | 'tags' | 'metadata' | 'library'>('basic');
  const [previewMode, setPreviewMode] = useState<'hero' | 'details'>('hero');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "All">("All");
  const [quest, setQuest] = useState<Quest>(createBlankQuest());
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const client = requireSupabase();
        // Fetch all quests, newest first
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
            duration: q.duration_label || q.length || "Half day", // ✨ Added fallback
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
        steps: quest.steps,
        content_blocks: quest.contentBlocks,
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

      alert("Quest successfully saved to database!");
      
      setSavedQuests(prev => {
        const mapped = { ...quest, id: result.data.id }; 
        return isNew ? [mapped, ...prev] : prev.map(q => q.id === quest.id ? mapped : q);
      });
      
      setView('grid');
    } catch (error: any) {
      console.error("Save error:", error);
      alert(`Failed to save quest: ${error.message || "Check terminal"}`);
    }
  };
  const handleDelete = async () => {
  if (window.confirm(`Are you sure you want to permanently delete "${quest.title}"?`)) {
    try {
      const client = requireSupabase();
      
      if (!quest.id.startsWith('draft-')) {
        // ✨ FIX: "Soft Delete" the quest. This hides it from the app and builder, 
        // but preserves it in the database so users' past journal entries don't break.
        const { error } = await client.from('quests')
          .update({ is_active: false })
          .eq('id', quest.id);
          
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
  // --- VIEW 1: DASHBOARD GRID ---
  if (view === 'grid') {
    // ✨ NEW: Filter logic now includes Category
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

        <TextInput 
          className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink max-w-md" 
          placeholder="Search quests..." 
          value={searchQuery} 
          onChangeText={setSearchQuery} 
        />

        {/* ✨ NEW: Category Filters */}
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

  // --- VIEW 2: SPLIT SCREEN EDITOR ---
  return (
    <View className="flex-1 flex-row bg-cream">
      
      <View className="w-1/2 border-r border-line bg-cream flex-1">
        
        {/* ✨ NEW: Editor Header now includes Delete button */}
        <View className="p-6 border-b border-line flex-row justify-between items-center bg-white">
          <Pressable onPress={() => setView('grid')} className="px-4 py-2 bg-stone rounded-md">
            <AppText className="text-ink">← Back to Library</AppText>
          </Pressable>
          
          <View className="flex-row gap-3">
            {/* Don't show delete on brand new unsaved quests */}
            {!quest.id.startsWith('draft-') && (
              <Pressable onPress={handleDelete} className="px-4 py-2 border border-[#E63946] rounded-md bg-[#E63946]/10">
                <AppText className="text-[#E63946] font-sansSemi">Delete</AppText>
              </Pressable>
            )}
            <Pressable onPress={handleSave} className="px-6 py-2 bg-orange rounded-md">
              <AppText className="text-white font-sansSemi">Save Quest</AppText>
            </Pressable>
          </View>
        </View>

        <View className="flex-row border-b border-line bg-stone">
          {(['basic', 'tags', 'metadata', 'library'] as const).map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} className={`flex-1 p-4 items-center ${activeTab === tab ? 'bg-white border-b-2 border-orange' : ''}`}>
              <AppText className={activeTab === tab ? 'text-ink font-sansSemi' : 'text-ink/50 capitalize'}>
                {tab === 'library' ? 'Widget Library' : `${tab} Info`}
              </AppText>
            </Pressable>
          ))}
        </View>

        <ScrollView className="flex-1 p-8" contentContainerStyle={{ paddingBottom: 100 }}>
          
          {activeTab === 'basic' && (
            <View>
              <AppText variant="subtitle" className="mb-2">Title</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.title} onChangeText={(txt) => updateField("title", txt)} />

              <AppText variant="subtitle" className="mb-2">Kicker (Eyebrow text)</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.kicker} onChangeText={(txt) => updateField("kicker", txt)} />

              <AppText variant="subtitle" className="mb-2">Cover Description</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" multiline numberOfLines={3} value={quest.description} onChangeText={(txt) => updateField("description", txt)} />

              <AppText variant="subtitle" className="mb-2">Image URL</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.imageUrl} onChangeText={(txt) => updateField("imageUrl", txt)} />

              <AppText variant="subtitle" className="mb-2">Image Focus (Cropping)</AppText>
                <ToggleGroup 
                  label=""
                  options={["top", "center", "bottom"]}
                  selected={quest.imagePosition || "center"}
                  onSelect={(val) => updateField("imagePosition", val)}
                />
            
            
            </View>
          )}

          {activeTab === 'tags' && (
            <View className="z-50">
              <ToggleGroup 
                label="Solo or Group Quest?"
                options={["Solo", "Group"]}
                selected={quest.maxParticipants > 1 ? "Group" : "Solo"}
                onSelect={(val) => {
                  if (val === 'Solo') updateField("maxParticipants", 1);
                  if (val === 'Group') updateField("maxParticipants", 5);
                }}
              />

              {quest.maxParticipants > 1 && (
                <View className="flex-row gap-4 mb-6 bg-stone p-4 rounded-lg">
                  <View className="flex-1">
                    <AppText className="text-xs mb-1">Min Group Size</AppText>
                    <TextInput className="bg-white border border-line rounded p-2" value={quest.minParticipants.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("minParticipants", parseInt(txt) || 2)} />
                  </View>
                  <View className="flex-1">
                    <AppText className="text-xs mb-1">Max Group Size</AppText>
                    <TextInput className="bg-white border border-line rounded p-2" value={quest.maxParticipants.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("maxParticipants", parseInt(txt) || 5)} />
                  </View>
                </View>
              )}

              <View className="flex-row gap-4 z-40">
                <MultiToggleGroup 
                  label="Categories (Select multiple)"
                  options={["Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"]}
                  selected={quest.categories}
                  onSelect={(val) => updateField("categories", val)}
                />
                
              </View>
              <View className="mb-6 z-40">
                <Dropdown label="Cost" value={quest.cost} options={["Free", "£", "££", "£££"]} onSelect={(val) => updateField("cost", val)} />
              </View>

              <View className="flex-row gap-4 z-30">
                <Dropdown label="Length" value={quest.length} options={["A few hours", "Full day", "Multi-day", "Long-term"]} onSelect={(val) => updateField("length", val)} />
                <Dropdown label="Difficulty" value={quest.difficulty} options={["Easy", "Medium", "Challenging"]} onSelect={(val) => updateField("difficulty", val)} />
              </View>

              <View className="flex-row gap-4 z-20">
                <View className="flex-1 mb-6">
                  <AppText variant="subtitle" className="mb-2">Points Awarded</AppText>
                  <TextInput className="bg-white border border-line rounded-lg p-4 font-sans text-ink" value={quest.pointsValue.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("pointsValue", parseInt(txt) || 10)} />
                </View>
                <View className="flex-1" />
              </View>
            </View>
          )}

          {/* ✨ NEW: METADATA TAB */}
          {activeTab === 'metadata' && (
            <View>
              <AppText className="text-ink/50 mb-6">This data is hidden from the main card, but is used by the algorithm to recommend quests to users.</AppText>

              <MultiToggleGroup 
                label="Seasons"
                options={["Spring", "Summer", "Autumn", "Winter", "All year"]}
                selected={quest.seasons}
                onSelect={(val) => updateField("seasons", val)}
              />

              <MultiToggleGroup 
                label="Accessibility"
                options={["Walking", "Public Transport", "Driving", "Wheelchair Accessible"]}
                selected={quest.accessibility}
                onSelect={(val) => updateField("accessibility", val)}
              />

              <MultiToggleGroup 
                label="Location Types"
                options={["City", "Town", "Countryside", "Abroad", "Anywhere"]}
                selected={quest.locationTypes}
                onSelect={(val) => updateField("locationTypes", val)}
              />
            </View>
          )}

          {activeTab === 'library' && (
            <View>
              <AppText variant="subtitle" className="mb-2">Widget Library</AppText>
              <AppText className="text-xs text-ink/50 mb-4">Click below to append a widget, or simply type '/' directly in the right-hand visual editor.</AppText>
              
              <Pressable 
                onPress={() => {
                  const newBlocks = [...(quest.contentBlocks || [])];
                  if (newBlocks.length === 0) newBlocks.push({ type: 'text', id: `t-${Date.now()}`, content: '' });
                  
                  const newWidgetId = `w-${Date.now()}`;
                  newBlocks.push({ type: 'widget', id: newWidgetId, widgetType: 'randomiser', version: 1, config: { options: ['Option 1', 'Option 2'] } });
                  newBlocks.push({ type: 'text', id: `t-${Date.now()+1}`, content: ' ' }); // Trailing space for continued typing
                  
                  updateField('contentBlocks', newBlocks);
                  setSelectedBlockId(newWidgetId);
                }}
                className="bg-white border border-line p-4 rounded-lg flex-row justify-between items-center shadow-sm"
              >
                <View>
                  <AppText className="font-sansSemi text-ink">Randomiser</AppText>
                  <AppText className="text-ink/50 text-xs">An inline rolling slot machine</AppText>
                </View>
                <AppText className="text-orange text-xl">+</AppText>
              </Pressable>

              {/* ✨ WIDGET SETTINGS PANE */}
              {selectedBlockId && (
                <View className="mt-8 p-4 bg-stone rounded-lg border border-line">
                  <View className="flex-row justify-between mb-4 items-center">
                    <AppText variant="subtitle">Widget Settings</AppText>
                    <Pressable onPress={() => {
                      const newBlocks = (quest.contentBlocks || []).filter(b => b.id !== selectedBlockId);
                      updateField('contentBlocks', newBlocks);
                      setSelectedBlockId(null);
                    }}>
                      <AppText className="text-[#E63946] text-xs font-sansSemi">Remove Widget</AppText>
                    </Pressable>
                  </View>

                  {(() => {
  const block = quest.contentBlocks?.find(b => b.id === selectedBlockId);
  
  // ✨ FIX: Check type narrowing first
  if (block && block.type === 'widget' && block.widgetType === 'randomiser') {
    return (
      <View>
        <AppText className="text-xs text-ink/50 mb-1">Options (comma separated)</AppText>
        <TextInput 
          className="bg-white border border-line rounded p-3 font-sans text-ink"
          value={block.config.options.join(', ')}
          onChangeText={(txt) => {
            const newBlocks = (quest.contentBlocks || []).map(b => 
              // Now TypeScript knows 'b' is a QuestWidget here
              b.id === selectedBlockId && b.type === 'widget' 
                ? { ...b, config: { options: txt.split(',').map(s => s.trim()) } } 
                : b
            );
            updateField('contentBlocks', newBlocks);
          }}
        />
      </View>
    );
  }
  return null;
})()}
                </View>
              )}
              
              <View className="my-6 h-px bg-line" />
              <AppText variant="subtitle" className="mb-2">Journal Prompt</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.journalPrompt} onChangeText={(txt) => updateField("journalPrompt", txt)} />
            </View>
          )}
        </ScrollView>
      </View>

      <View className="w-1/2 bg-stone items-center justify-center p-4">
        
        <View className="absolute top-10 flex-row bg-white rounded-full p-1 border border-line shadow-sm z-50">
          <Pressable onPress={() => setPreviewMode('hero')} className={`px-6 py-2 rounded-full ${previewMode === 'hero' ? 'bg-ink' : 'bg-transparent'}`}>
            <AppText className={previewMode === 'hero' ? 'text-ivory' : 'text-ink/60'}>Card Preview</AppText>
          </Pressable>
          <Pressable onPress={() => setPreviewMode('details')} className={`px-6 py-2 rounded-full ${previewMode === 'details' ? 'bg-ink' : 'bg-transparent'}`}>
            <AppText className={previewMode === 'details' ? 'text-ivory' : 'text-ink/60'}>Details Preview</AppText>
          </Pressable>
        </View>

        <View className="w-[400px] h-[750px] bg-cream rounded-[45px] border-[8px] border-white shadow-xl overflow-hidden justify-center px-4">
          {previewMode === 'hero' ? (
            <QuestHero quest={quest} onPressOverride={() => { setPreviewMode('details'); setActiveTab('library'); }} />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 40 }}>
              <AppText variant="display" className="mb-6">{quest.title}</AppText>
              
              <View className="rounded-card border border-line bg-cream p-6">
                
                <AppText variant="subtitle" className="mb-2">Why it matters</AppText>
                <TextInput className="bg-white/50 border border-line/30 rounded p-2 mb-6 font-sans text-ink text-sm" multiline value={quest.whyItMatters} onChangeText={(txt) => updateField("whyItMatters", txt)} />
                
                <AppText variant="subtitle" className="text-orange mb-1">The Experience (WYSIWYG)</AppText>
                <AppText className="text-[10px] text-ink/40 mb-4 uppercase tracking-widest">Type '/' in text to insert a widget.</AppText>
                
                <View className="bg-white p-4 rounded-xl border border-line shadow-sm flex-row flex-wrap items-center">
                  {(quest.contentBlocks || []).map((block, index) => {
                    if (block.type === 'text') {
                      return (
                        <TextInput
                          key={block.id}
                          className="font-sans text-ink/80 text-base leading-relaxed m-0 p-0 min-w-[30px]"
                          style={{ outlineStyle: 'none' } as any}
                          value={block.content}
                          multiline
                          placeholder="..."
                          onChangeText={(txt) => {
                            // ✨ The Magic / Slash Command 
                            if (txt.endsWith('/')) {
                              const newText = txt.slice(0, -1);
                              const newBlocks = [...(quest.contentBlocks || [])];
                              newBlocks[index] = { ...block, content: newText };
                              const newWidgetId = `w-${Date.now()}`;
                              // Inject the widget and a new text block after it
                              newBlocks.splice(index + 1, 0, 
                                { type: 'widget', id: newWidgetId, widgetType: 'randomiser', version: 1, config: { options: ['Opt 1', 'Opt 2'] } },
                                { type: 'text', id: `t-${Date.now()+1}`, content: ' ' }
                              );
                              updateField('contentBlocks', newBlocks);
                              setSelectedBlockId(newWidgetId);
                              setActiveTab('library');
                            } else {
                              const newBlocks = [...(quest.contentBlocks || [])];
                              newBlocks[index] = { ...block, content: txt };
                              updateField('contentBlocks', newBlocks);
                            }
                          }}
                        />
                      );
                    } else if (block.type === 'widget') {
                      return (
                        <Pressable 
                          key={block.id}
                          onPress={() => {
                            setSelectedBlockId(block.id);
                            setActiveTab('library');
                          }}
                          className={`rounded-full ${selectedBlockId === block.id ? 'ring-2 ring-orange ring-offset-2' : ''}`}
                        >
                          <View pointerEvents="none">
                            <RandomiserWidget options={block.config.options} accent={quest.accent} />
                          </View>
                        </Pressable>
                      );
                    }
                  })}
                  {/* Fallback to start typing if empty */}
                  {(!quest.contentBlocks || quest.contentBlocks.length === 0) && (
                     <Pressable onPress={() => updateField('contentBlocks', [{ type: 'text', id: `t-new`, content: '' }])}>
                       <AppText className="text-ink/30 italic">Click here to start writing...</AppText>
                     </Pressable>
                  )}
                </View>

              </View>
            </ScrollView>
          )}
        </View>

      </View>
    </View>
  );
}