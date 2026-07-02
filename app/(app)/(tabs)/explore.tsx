// app/(app)/(tabs)/explore.tsx
import { useState, useMemo, useEffect } from "react";
import { View, ScrollView, TextInput, Pressable, ActivityIndicator, TouchableOpacity } from "react-native";
import { Screen } from "../../../src/shared/components/Screen";
import { AppText } from "../../../src/shared/components/AppText";
import { QuestCard } from "../../../src/features/quests/components/QuestCard";
import { Ionicons } from '@expo/vector-icons'; // ✨ Needed for filter icon
import { useAuth } from "../../../src/features/auth/AuthProvider";
import { useRouter } from "expo-router";
import type { 
  Quest, 
  QuestCategory, 
  QuestCost, 
  QuestLength, 
  QuestDifficulty, 
  QuestSeason, 
  QuestAccessibility, 
  QuestLocationType 
} from "../../../src/shared/types/domain";
import Animated, { FadeInDown } from 'react-native-reanimated';
import { requireSupabase } from "../../../src/lib/supabase";
import { useExperienceStore } from "../../../src/features/app/store/useExperienceStore";

const CATEGORIES: (QuestCategory | "All" | "Saved")[] = ["All", "Saved", "Adventure", "Skill", "Culture", "Food & Drink", "Wellness", "Social"];
const COSTS: (QuestCost | "All")[] = ["All", "Free", "£", "££", "£££"]; // ✨ FIX 2
const LENGTHS: (QuestLength | "All")[] = ["All", "A few hours", "Full day", "Multi-day", "Long-term"]; // ✨ FIX 2

export default function Explore() {
  const router = useRouter(); // ✨ NEW
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<QuestCategory | "All" | "Saved">("All");
  
  // State for real Supabase data
  const [showFilters, setShowFilters] = useState(false);
  const [activeCost, setActiveCost] = useState<QuestCost | "All">("All");
  const [activeLength, setActiveLength] = useState<QuestLength | "All">("All");

  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { savedQuestIds } = useExperienceStore();
  // Fetch real quests from Supabase
  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const client = requireSupabase();
        const { data: completedData } = await client
        .from('user_quests')
        .select('quest_id')
        .eq('user_id', user?.id)
        .eq('status', 'completed');

        const completedIds = completedData?.map(c => c.quest_id) || [];
        const { data, error } = await client.from('quests').select('*').eq('is_active', true).order('created_at', { ascending: false });
        
        if (error) throw error;

        if (data) {
          const mappedQuests: Quest[] = data
          .filter(q => !completedIds.includes(q.id))
          .map(q => ({
            id: q.id,
            slug: q.slug,
            title: q.title,
            kicker: q.kicker,
            description: q.description,
            whyItMatters: q.why_it_matters || "",
            locationHint: q.location_hint || "Anywhere",
            duration: q.duration_label || q.length || "Half day", // ✨ Missing duration fixed
            mood: q.mood || "wild",
            accent: q.accent || "orange",
      
            steps: q.steps || [],
            journalPrompt: q.journal_prompt || "",
            pointsValue: q.points_value || 10,
            
            //  Strict Type Casting to fix the string errors
            imageUrl: q.image_url,
            imagePosition: q.image_position || "center", // ✨ NEW
            categories: (q.categories as QuestCategory[]) || (q.category ? [q.category]: ["Adventure"]),
            cost: (q.cost as QuestCost) || "Free",
            length: (q.length as QuestLength) || "Half day",
            difficulty: (q.difficulty as QuestDifficulty) || "Medium",
            minParticipants: q.min_participants || 1,
            maxParticipants: q.max_participants || 1,
            seasons: (q.seasons as QuestSeason[]) || ["All year"],
            accessibility: (q.accessibility as QuestAccessibility[]) || [],
            locationTypes: (q.location_types as QuestLocationType[]) || ["Anywhere"]
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
      
      if (activeCategory === "Saved") {
        return matchesSearch && savedQuestIds.includes(q.id);
      }
      
      const safeCategories = q.categories || (q.category ? [q.category] : ["Adventure"]);
      const matchesCategory = activeCategory === "All" || safeCategories.includes(activeCategory as any);
      
      const matchesCost = activeCost === "All" || q.cost === activeCost;
      const matchesLength = activeLength === "All" || q.length === activeLength;
      
      return matchesSearch && matchesCategory && matchesCost && matchesLength;
    });
  }, [searchQuery, activeCategory, activeCost, activeLength, quests, savedQuestIds]);
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View className="px-6 pt-6 mb-6">
          <AppText variant="display" className="mb-6">Explore</AppText>
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center bg-white border border-line rounded-full px-5 py-3 shadow-sm">
              <AppText className="text-ink/40 mr-3">🔍</AppText>
              <TextInput
                className="flex-1 font-sans text-ink"
                placeholder="Search quests..."
                placeholderTextColor="#9ca3af" 
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            {/* ✨ FIX 2: Filter Toggle Button */}
            <Pressable 
              onPress={() => setShowFilters(!showFilters)}
              className={`h-12 w-12 items-center justify-center rounded-full border shadow-sm ${showFilters ? 'bg-ink border-ink' : 'bg-white border-line'}`}
            >
              <Ionicons name="options" size={20} color={showFilters ? '#F6F5F2' : '#1C1A17'} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 pl-6" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat;
            return (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-full border ${isActive ? 'bg-ink border-ink' : 'bg-transparent border-line'}`}>
                <AppText className={isActive ? 'text-ivory font-sansSemi' : 'text-ink'}>{cat}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ✨ FIX 2: Expanding Filters */}
        {showFilters && (
          <Animated.View entering={FadeInDown.duration(200)} className="mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 pl-6" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
              {COSTS.map(cost => {
                const isActive = activeCost === cost;
                return (
                  <Pressable key={cost} onPress={() => setActiveCost(cost)} className={`px-4 py-1.5 rounded-full border ${isActive ? 'bg-stone border-ink' : 'bg-transparent border-line/40'}`}>
                    <AppText variant="caption" className={isActive ? 'text-ink font-sansSemi' : 'text-ink/60'}>{cost}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-6" contentContainerStyle={{ paddingRight: 40, gap: 8 }}>
              {LENGTHS.map(len => {
                const isActive = activeLength === len;
                return (
                  <Pressable key={len} onPress={() => setActiveLength(len)} className={`px-4 py-1.5 rounded-full border ${isActive ? 'bg-stone border-ink' : 'bg-transparent border-line/40'}`}>
                    <AppText variant="caption" className={isActive ? 'text-ink font-sansSemi' : 'text-ink/60'}>{len}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}
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