import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../../shared/components/AppText";
import type { Journey } from "../../../shared/types/domain";
import { getJourneyQuestIds } from "../api/questApi";

function contentPosition(imagePosition?: string) {
  const posMatch = imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  return posMatch ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` } : (imagePosition || "center");
}

function JourneyProgressDots({ completed, total }: { completed: number; total: number }) {
  const visibleTotal = Math.max(total, 1);
  const visibleCompleted = Math.min(completed, visibleTotal);

  return (
    <View className="w-full flex-row items-center">
      {Array.from({ length: visibleTotal }).map((_, index) => {
        const isComplete = index < visibleCompleted;
        return (
          <View key={index} className={`${index < visibleTotal - 1 ? "flex-1" : ""} flex-row items-center`}>
            <View className={`h-4 w-4 rounded-full border ${isComplete ? "border-accent bg-accent" : "border-line/70 bg-transparent"}`} />
            {index < visibleTotal - 1 ? <View className={`h-px flex-1 ${index < visibleCompleted - 1 ? "bg-accent" : "bg-line/70"}`} /> : null}
          </View>
        );
      })}
    </View>
  );
}

export function JourneyMembershipSection({
  journeys,
  completedQuestIds,
  onJourneyPress
}: {
  journeys: Journey[];
  completedQuestIds: Set<string>;
  onJourneyPress: (journey: Journey) => void;
}) {
  if (journeys.length === 0) return null;

  return (
    <View className="mt-7">
      <View className="mb-6">
        <View className="flex-row items-center">
          <Ionicons name="trail-sign-outline" size={22} color="#D9AA62" />
          <AppText variant="subtitle" className="ml-3 text-ink">
            Part of your journeys
          </AppText>
        </View>
        <AppText className="mt-2 text-base leading-6 text-muted">
          Track your progress in the journeys that include this quest.
        </AppText>
      </View>

      <View className="gap-4">
        {journeys.map((journey) => {
          const questIds = getJourneyQuestIds(journey);
          const totalCount = Math.max(journey.totalCount || 0, questIds.length, 1);
          const completedCount = questIds.filter((questId) => completedQuestIds.has(questId)).length;

          return (
            <Pressable
              key={journey.id}
              onPress={() => onJourneyPress(journey)}
              className="overflow-hidden rounded-[18px] border border-line/70 bg-surface active:opacity-80 dark:bg-[#141D1E]"
            >
              <View className="flex-row">
                <Image
                  source={{ uri: journey.backgroundImageUrl }}
                  className="h-[112px] w-[108px] bg-stone"
                  contentFit="cover"
                  contentPosition={contentPosition(journey.imagePosition) as any}
                />
                <View className="min-w-0 flex-1 justify-center px-4 py-2">
                  <View>
                    <View className="self-start rounded-[9px] border border-accent/40 px-3 py-0.5">
                      <AppText className="font-sansSemi text-[11px] leading-4 text-accent">
                        {totalCount} QUEST{totalCount === 1 ? "" : "S"}
                      </AppText>
                    </View>
                    <AppText variant="subtitle" className="mt-2 text-xl leading-6 text-ink" numberOfLines={1}>
                      {journey.title}
                    </AppText>
                    <AppText className="mt-1 text-[13px] leading-[18px] text-muted" numberOfLines={1}>
                      {journey.description}
                    </AppText>
                  </View>
                </View>

                <View className="my-3 w-px bg-line/50" />

                <View className="w-[188px] items-center justify-center px-4">
                  <AppText className="font-sansSemi text-[13px] leading-5 text-ink">
                    {completedCount} / {totalCount} completed
                  </AppText>
                  <View className="mt-3 w-full">
                    <JourneyProgressDots completed={completedCount} total={totalCount} />
                  </View>
                  <View className="mt-3 w-full rounded-[10px] border border-line/60 px-4 py-2">
                    <View className="flex-row items-center justify-between">
                      <AppText className="font-sansSemi text-[13px] leading-5 text-accent">
                        View journey
                      </AppText>
                      <Ionicons name="chevron-forward" size={16} color="#D9AA62" />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
