// app/(app)/(tabs)/explore.tsx
import { useState, useMemo, useEffect } from "react";
import { View, ScrollView, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import type { Quest, QuestCategory } from "../../../src/shared/types/domain";
import { requireSupabase } from "../../../src/lib/supabase";

const CATEGORIES: (QuestCategory | "All")[] = [
  "All", "Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"
];

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "All">("All");
  
  // State for real Supabase data
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✨ NEW: Fetch real quests from Supabase
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const client = requireSupabase();
        const { data, error } = await client.from('quests').select('*').order('created_at', { ascending: false });
        
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
            mood: q.mood || "wild",
            accent: q.accent || "orange",
            imageUrl: q.image_url,
            steps: q.steps || [],
            journalPrompt: q.journal_prompt || "",
            pointsValue: q.points_value || 10,
            category: q.category || "Adventure",
            cost: q.cost || "Free",
            length: q.length || "Half day",
            difficulty: q.difficulty || "Medium",
            minParticipants: q.min_participants || 1,
            maxParticipants: q.max_participants || 1,
            seasons: q.seasons || ["All year"],
            accessibility: q.accessibility || [],
            locationTypes: q.location_types || ["Anywhere"]
          }));
          setQuests(mappedQuests);
        }
      } catch (error) {
        console.error("Error fetching live quests:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuests();
  }, []);

  const filteredQuests = useMemo(() => {
    return quests.filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            q.description.toLowerCase().includes(searchQuery.toLowerCase());
      const safeCategory = q.category || "Adventure";
      const matchesCategory = activeCategory === "All" || safeCategory === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory, quests]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View className="px-6 pt-6 mb-6">
          <AppText variant="display" className="mb-6">Explore</AppText>
          <View className="flex-row items-center bg-white border border-line rounded-full px-5 py-3 shadow-sm">
            <AppText className="text-ink/40 mr-3">🔍</AppText>
            <TextInput
              className="flex-1 font-sans text-ink"
              placeholder="Search quests..."
              placeholderTextColor="#9ca3af" 
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="mb-8 pl-6" 
          contentContainerStyle={{ paddingRight: 40, gap: 8 }}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full border ${isActive ? 'bg-ink border-ink' : 'bg-transparent border-line'}`}
              >
                <AppText className={isActive ? 'text-ivory font-sansSemi' : 'text-ink'}>{cat}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="px-6">
          <AppText variant="subtitle" className="mb-4 text-ink/70">
            {searchQuery ? "Search Results" : activeCategory !== "All" ? `${activeCategory} Quests` : "All Quests"}
          </AppText>
          
          {isLoading ? (
             <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#1C1A17" />
             </View>
          ) : filteredQuests.length === 0 ? (
            <View className="items-center justify-center py-12 border border-dashed border-line rounded-card">
              <AppText className="text-ink/50 text-center">No quests found.</AppText>
            </View>
          ) : (
            <View className="gap-4">
              {filteredQuests.map(q => (
                <QuestCard key={q.id} quest={q} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}