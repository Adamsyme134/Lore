// app/admin/quest-builder.tsx
import { useState } from "react";
import { View, ScrollView, TextInput, Pressable } from "react-native";
import { AppText } from "../../src/shared/components/AppText";
import { QuestHero } from "../../src/features/quests/components/QuestHero";
import { QuestDetailBlock } from "../../src/features/quests/components/QuestDetailBlock";
import { QuestCard } from "../../src/features/quests/components/QuestCard";
import type { Quest, QuestCategory, QuestCost, QuestDifficulty, QuestLength } from "../../src/shared/types/domain";

// --- CUSTOM UI COMPONENTS FOR ADMIN ---

// 1. Custom Dropdown Component
function Dropdown({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (val: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View className="flex-1 relative z-50 mb-6">
      <AppText variant="subtitle" className="mb-2">{label}</AppText>
      <Pressable 
        onPress={() => setIsOpen(!isOpen)} 
        className="bg-white border border-line rounded-lg p-4 flex-row justify-between items-center"
      >
        <AppText className="text-ink font-sans">{value}</AppText>
        <AppText className="text-ink/50">▼</AppText>
      </Pressable>
      
      {isOpen && (
        <View className="absolute top-20 left-0 right-0 bg-white border border-line rounded-lg shadow-lg z-50 max-h-48 overflow-hidden">
          <ScrollView nestedScrollEnabled>
            {options.map((opt) => (
              <Pressable 
                key={opt} 
                onPress={() => { onSelect(opt); setIsOpen(false); }}
                className="p-4 border-b border-line/50 hover:bg-stone"
              >
                <AppText className={value === opt ? "font-sansSemi text-orange" : "text-ink"}>{opt}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// 2. Custom Toggle Component
function ToggleGroup({ label, options, selected, onSelect }: { label: string, options: string[], selected: string, onSelect: (val: string) => void }) {
  return (
    <View className="mb-6">
      <AppText variant="subtitle" className="mb-2">{label}</AppText>
      <View className="flex-row rounded-lg border border-line overflow-hidden bg-white">
        {options.map((opt) => {
          const isActive = selected === opt;
          return (
            <Pressable 
              key={opt}
              onPress={() => onSelect(opt)}
              className={`flex-1 p-3 items-center justify-center ${isActive ? 'bg-ink' : 'bg-transparent'}`}
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
  mood: "wild",
  accent: "orange",
  imageUrl: "https://images.unsplash.com/photo-1501555088652-021faa106b9b",
  steps: ["Step 1...", "Step 2..."],
  journalPrompt: "What did you learn?",
  pointsValue: 15,
  category: "Adventure",
  cost: "Free",
  length: "Half day",
  difficulty: "Medium",
  minParticipants: 1,
  maxParticipants: 1,
  seasons: ["All year"],
  accessibility: ["Walking"],
  locationTypes: ["Anywhere"]
});

export default function QuestBuilderAdmin() {
  const [view, setView] = useState<'grid' | 'editor'>('grid');
  const [activeTab, setActiveTab] = useState<'basic' | 'tags' | 'inside'>('basic');
  const [previewMode, setPreviewMode] = useState<'hero' | 'details'>('hero');
  
  // App State
  const [savedQuests, setSavedQuests] = useState<Quest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quest, setQuest] = useState<Quest>(createBlankQuest());

  const updateField = (field: keyof Quest, value: any) => {
    setQuest((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // In the future, this is where you call Supabase!
    setSavedQuests(prev => {
      const exists = prev.find(q => q.id === quest.id);
      if (exists) return prev.map(q => q.id === quest.id ? quest : q);
      return [quest, ...prev];
    });
    setView('grid');
  };

  // --- VIEW 1: DASHBOARD GRID ---
  if (view === 'grid') {
    const filtered = savedQuests.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return (
      <View className="flex-1 bg-cream p-10">
        <View className="flex-row justify-between items-center mb-10">
          <AppText variant="display">Quest Library</AppText>
          <Pressable 
            onPress={() => { setQuest(createBlankQuest()); setView('editor'); setPreviewMode('hero'); setActiveTab('basic'); }}
            className="bg-ink px-6 py-3 rounded-full"
          >
            <AppText className="text-ivory font-sansSemi">+ Create New Quest</AppText>
          </Pressable>
        </View>

        <TextInput 
          className="bg-white border border-line rounded-lg p-4 mb-8 font-sans text-ink max-w-md"
          placeholder="Search quests..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

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
                  <Pressable 
                    onPress={() => { setQuest(q); setView('editor'); setPreviewMode('hero'); setActiveTab('basic'); }}
                    className="mt-2 bg-stone py-2 rounded-lg items-center border border-line"
                  >
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
      
      {/* LEFT PANEL: The Editor */}
      <View className="w-1/2 border-r border-line bg-cream flex-1">
        
        {/* Editor Header */}
        <View className="p-6 border-b border-line flex-row justify-between items-center bg-white">
          <Pressable onPress={() => setView('grid')} className="px-4 py-2 bg-stone rounded-md">
            <AppText className="text-ink">← Back to Library</AppText>
          </Pressable>
          <Pressable onPress={handleSave} className="px-6 py-2 bg-orange rounded-md">
            <AppText className="text-white font-sansSemi">Save Quest</AppText>
          </Pressable>
        </View>

        {/* Editor Tabs */}
        <View className="flex-row border-b border-line bg-stone">
          {(['basic', 'tags', 'inside'] as const).map(tab => (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} className={`flex-1 p-4 items-center ${activeTab === tab ? 'bg-white border-b-2 border-orange' : ''}`}>
              <AppText className={activeTab === tab ? 'text-ink font-sansSemi' : 'text-ink/50 capitalize'}>
                {tab === 'inside' ? 'Inside Content' : `${tab} Info`}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Editor Form Area */}
        <ScrollView className="flex-1 p-8" contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* TAB 1: BASIC INFO */}
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
            </View>
          )}

          {/* TAB 2: TAGS & MECHANICS */}
          {activeTab === 'tags' && (
            <View className="z-50">
              <ToggleGroup 
                label="Solo or Group Quest?"
                options={["Solo", "Group"]}
                selected={quest.maxParticipants > 1 ? "Group" : "Solo"}
                onSelect={(val) => {
                  if (val === 'Solo') updateField("maxParticipants", 1);
                  if (val === 'Group') updateField("maxParticipants", 5); // Default group size
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
                <Dropdown label="Category" value={quest.category} options={["Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"]} onSelect={(val) => updateField("category", val)} />
                <Dropdown label="Cost" value={quest.cost} options={["Free", "£", "££", "£££"]} onSelect={(val) => updateField("cost", val)} />
              </View>

              <View className="flex-row gap-4 z-30">
                <Dropdown label="Length" value={quest.length} options={["Half day", "Full day", "Multi-day", "Long-term"]} onSelect={(val) => updateField("length", val)} />
                <Dropdown label="Difficulty" value={quest.difficulty} options={["Easy", "Medium", "Challenging"]} onSelect={(val) => updateField("difficulty", val)} />
              </View>

              <View className="flex-row gap-4 z-20">
                <View className="flex-1 mb-6">
                  <AppText variant="subtitle" className="mb-2">Points Awarded</AppText>
                  <TextInput className="bg-white border border-line rounded-lg p-4 font-sans text-ink" value={quest.pointsValue.toString()} keyboardType="number-pad" onChangeText={(txt) => updateField("pointsValue", parseInt(txt) || 10)} />
                </View>
                <View className="flex-1" /> {/* Spacer */}
              </View>
            </View>
          )}

          {/* TAB 3: INSIDE CONTENT */}
          {activeTab === 'inside' && (
            <View>
              <AppText variant="subtitle" className="mb-2">Why it matters</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" multiline numberOfLines={4} value={quest.whyItMatters} onChangeText={(txt) => updateField("whyItMatters", txt)} />

              <AppText variant="subtitle" className="mb-1">Checklist Steps</AppText>
              <AppText className="text-xs text-ink/50 mb-2">Put each step on a new line.</AppText>
              <TextInput 
                className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink leading-6" 
                multiline 
                style={{ height: 160, textAlignVertical: 'top' }}
                value={quest.steps.join('\n')} 
                onChangeText={(txt) => {
                  const lines = txt.split('\n');
                  updateField("steps", lines);
                }} 
              />

              <AppText variant="subtitle" className="mb-2">Journal Prompt</AppText>
              <TextInput className="bg-white border border-line rounded-lg p-4 mb-6 font-sans text-ink" value={quest.journalPrompt} onChangeText={(txt) => updateField("journalPrompt", txt)} />
            </View>
          )}
        </ScrollView>
      </View>

      {/* RIGHT PANEL: Live App Preview */}
      <View className="w-1/2 bg-stone items-center justify-center p-4">
        
        {/* Preview Switcher */}
        <View className="absolute top-10 flex-row bg-white rounded-full p-1 border border-line shadow-sm z-50">
          <Pressable onPress={() => setPreviewMode('hero')} className={`px-6 py-2 rounded-full ${previewMode === 'hero' ? 'bg-ink' : 'bg-transparent'}`}>
            <AppText className={previewMode === 'hero' ? 'text-ivory' : 'text-ink/60'}>Card Preview</AppText>
          </Pressable>
          <Pressable onPress={() => setPreviewMode('details')} className={`px-6 py-2 rounded-full ${previewMode === 'details' ? 'bg-ink' : 'bg-transparent'}`}>
            <AppText className={previewMode === 'details' ? 'text-ivory' : 'text-ink/60'}>Details Preview</AppText>
          </Pressable>
        </View>

        {/* The Live Mobile Device Frame */}
        <View className="w-[400px] h-[750px] bg-cream rounded-[45px] border-[8px] border-white shadow-xl overflow-hidden justify-center px-4">
          
          {previewMode === 'hero' ? (
            <QuestHero 
              quest={quest} 
              onPressOverride={() => {
                // When they click the button on the card, flip to the Details View and the Inside Content tab!
                setPreviewMode('details');
                setActiveTab('inside');
              }} 
            />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 40 }}>
              <AppText variant="display" className="mb-6">{quest.title}</AppText>
              <QuestDetailBlock quest={quest} isActive={true} />
            </ScrollView>
          )}

        </View>
      </View>
    </View>
  );
}