import { View, Text } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";
import { LocationWidget } from "./widgets/LocationWidget";
import { RandomiserWidget } from './widgets/RandomiserWidget';
import { YouTubeWidget } from './widgets/YoutubeWidget'; // New
import { LinkWidget } from './widgets/LinkWidget'; // New
import { QuestStepCard } from "./QuestStepCard"; // New

const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) obj[k] = decodeURIComponent(v || '');
  });
  return obj;
};

type QuestDetailBlockProps = {
  quest: Quest;
  checkedSteps?: number[];
  onToggleStep?: (index: number) => void;
  isActive?: boolean;
};

export function QuestDetailBlock({ quest, checkedSteps = [], onToggleStep, isActive = false }: QuestDetailBlockProps) {
  const accent = accentClass[quest.accent] || accentClass['orange']; 
  const isGroup = quest.maxParticipants > 1;
  const groupLabel = isGroup ? `Group (${quest.minParticipants}-${quest.maxParticipants})` : "Solo";

  // Assuming sequential steps: the active step is the first one not in checkedSteps
  const currentActiveStepIndex = isActive ? checkedSteps.length : -1;

  return (
    <View className="mt-4">
      <View className="mb-6 flex-row flex-wrap gap-2 px-2">
        {Array.isArray(quest.categories) ? quest.categories.map(cat => <Chip key={cat} label={cat} />) : null}
        {quest.cost ? <Chip label={quest.cost} /> : null}
        {quest.length ? <Chip label={quest.length} /> : null}
        {groupLabel ? <Chip label={groupLabel} /> : null}
      </View>

      <View className="px-2 mb-6">
        <AppText variant="subtitle" className={accent.text}>The Briefing</AppText>
        <AppText className="mt-2 text-ink/70">{quest.whyItMatters}</AppText>
      </View>

      <View className="gap-2">
        {quest.steps.map((step, index) => {
          const isCompleted = checkedSteps.includes(index);
          const isActiveStep = index === currentActiveStepIndex && isActive;
          const isLocked = index > currentActiveStepIndex || !isActive;

          const parsed = step.split(/(\[[A-Z_]+:.*?\])/g);

          return (
            <QuestStepCard 
              key={index} 
              stepIndex={index}
              totalSteps={quest.steps.length}
              isActiveStep={isActiveStep}
              isCompleted={isCompleted}
              isLocked={isLocked && !isCompleted}
              accent={quest.accent}
              onComplete={() => { if (onToggleStep) onToggleStep(index); }}
            >
              <Text className={`leading-8 text-base font-sans ${isCompleted ? 'text-ink/50' : 'text-ink/80'}`}>
                {parsed.map((part, i) => {
                  if (part.startsWith('[RANDOMISER:')) {
                    const raw = part.replace('[RANDOMISER:', '').replace(']', '');
                    return <RandomiserWidget key={i} config={raw as any} accent={quest.accent} />;
                  }
                  if (part.startsWith("[LOCATION:")) {
                    const raw = part.replace("[LOCATION:", "").replace("]", "");
                    return <LocationWidget key={i} config={raw as any} accent={accent} />;
                  }
                  if (part.startsWith("[YOUTUBE:")) {
                    const raw = part.replace("[YOUTUBE:", "").replace("]", "");
                    return <YouTubeWidget key={i} config={raw} />;
                  }
                  if (part.startsWith("[LINK:")) {
                    const raw = part.replace("[LINK:", "").replace("]", "");
                    return <LinkWidget key={i} config={raw} />;
                  }
                  return <Text key={i}>{part}</Text>;
                })}
              </Text>
            </QuestStepCard>
          );
        })}
      </View>
    </View>
  );
}