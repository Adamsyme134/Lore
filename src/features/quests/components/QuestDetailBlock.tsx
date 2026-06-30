import { View, Text } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";
import { LocationWidget } from "./widgets/LocationWidget";
import { RandomiserWidget } from './widgets/RandomiserWidget';
import { YouTubeWidget } from './widgets/YouTubeWidget';
import { LinkWidget } from './widgets/LinkWidget'; 
import { QuestStepCard } from "./QuestStepCard"; 

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
              <View className="flex-col w-full">
                {(() => {
                  const blocks: React.ReactNode[] = [];
                  let currentInline: React.ReactNode[] = [];

                  const flushInline = () => {
                    if (currentInline.length > 0) {
                      blocks.push(
                        <Text key={`inline-${blocks.length}`} className={`leading-8 text-base font-sans ${isCompleted ? 'text-ink/50' : 'text-ink/80'}`}>
                          {currentInline}
                        </Text>
                      );
                      currentInline = [];
                    }
                  };

                  parsed.forEach((part, i) => {
                    console.log(`[QuestDetailBlock] Step ${index}, Part ${i}:`, part.substring(0, 100)); // <--- DEBUG LOG

                    if (part.startsWith('[YOUTUBE:')) {
                      flushInline(); 
                      // Use slice instead of replace to guarantee we don't break the iframe brackets
                      const raw = part.slice(9, -1); 
                      console.log(`[QuestDetailBlock] Sending to YouTubeWidget:`, raw.substring(0, 100)); // <--- DEBUG LOG
                      blocks.push(<YouTubeWidget key={`yt-${i}`} config={raw} />);
                    } else if (part.startsWith("[LOCATION:")) {
                      flushInline(); 
                      const raw = part.slice(10, -1);
                      blocks.push(<LocationWidget key={`loc-${i}`} config={raw as any} accent={accent} />);
                    } else if (part.startsWith('[RANDOMISER:')) {
                      const raw = part.slice(12, -1);
                      currentInline.push(<RandomiserWidget key={`rand-${i}`} config={raw as any} accent={quest.accent} />);
                    } else if (part.startsWith("[LINK:")) {
                      const raw = part.slice(6, -1);
                      currentInline.push(<LinkWidget key={`link-${i}`} config={raw} />);
                    } else if (part !== "") {
                      currentInline.push(<Text key={`text-${i}`}>{part}</Text>);
                    }
                  });

                  flushInline(); 
                  return blocks;
                })()}
              </View>
            </QuestStepCard>
          );
        })}
      </View>
    </View>
  );
}