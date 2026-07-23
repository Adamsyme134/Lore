import { View } from "react-native";
import type { Quest } from "../../../shared/types/domain";
import { AppText } from "../../../shared/components/AppText";
import { Chip } from "../../../shared/components/Chip";
import { accentClass } from "../../../shared/design/tokens";
import { LocationWidget } from "./widgets/LocationWidget";
import { RandomiserWidget } from './widgets/RandomiserWidget';
import { YouTubeWidget } from './widgets/YouTubeWidget';
import { LinkWidget } from './widgets/LinkWidget'; 
import { QuestStepCard } from "./QuestStepCard"; 
import { useQuestExecution } from "../context/QuestExecutionContext"; 
import { ChecklistWidget } from './widgets/ChecklistWidget'; 
import { MapWidget } from './widgets/MapWidget';
import { CardRevealWidget } from './widgets/CardRevealWidget';
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

// --- NEW HELPER ---
const extractTitleAndText = (stepStr: string) => {
  const match = stepStr.match(/\[TITLE:(.*?)\]/);
  if (match) {
    return { title: match[1], text: stepStr.replace(match[0], '') };
  }
  return { title: "", text: stepStr };
};

const deriveFallbackTitle = (stepText: string) => {
  const textOnly = stepText
    .replace(/\[[A-Z_]+:.*?\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const firstThought = textOnly.split(/[.!?\n]/)[0]?.trim();
  return firstThought ? firstThought.slice(0, 64) : "Quest task";
};

type QuestDetailBlockProps = {
  quest: Quest;
  checkedSteps?: number[];
  onToggleStep?: (index: number) => void;
  isActive?: boolean;
  expandedStepIndex?: number | null;
  onExpandedStepChange?: (index: number | null) => void;
  onStepLayout?: (index: number, y: number) => void;
  onStepsListLayout?: (y: number) => void;
  onBlockLayout?: (y: number) => void;
};

export function QuestDetailBlock({
  quest,
  checkedSteps = [],
  onToggleStep,
  isActive = false,
  expandedStepIndex,
  onExpandedStepChange,
  onStepLayout,
  onStepsListLayout,
  onBlockLayout
}: QuestDetailBlockProps) {
  const { getVariable } = useQuestExecution();
  const accent = accentClass[quest.accent] || accentClass['orange']; 
  const isGroup = quest.maxParticipants > 1;
  const groupLabel = isGroup ? `Group (${quest.minParticipants}-${quest.maxParticipants})` : "Solo";
  const currentActiveStepIndex = isActive ? checkedSteps.length : -1;
  
  return (
    <View className="mt-4" onLayout={(event) => onBlockLayout?.(event.nativeEvent.layout.y)}>
      <View className="mb-6 flex-row flex-wrap gap-2 px-2">
        {Array.isArray(quest.categories) ? quest.categories.map(cat => <Chip key={cat} label={cat} />) : null}
        {quest.cost ? <Chip label={quest.cost} /> : null}
        {quest.length ? <Chip label={quest.length} /> : null}
        {groupLabel ? <Chip label={groupLabel} /> : null}
      </View>

      <View className="px-2 mb-6">
        <AppText variant="subtitle" className={accent.text}>Why do it?</AppText>
        <AppText className="mt-2 text-ink/70">{quest.whyItMatters}</AppText>
      </View>

      <View className="gap-2" onLayout={(event) => onStepsListLayout?.(event.nativeEvent.layout.y)}>
        {quest.steps.map((step, index) => {
          const isCompleted = checkedSteps.includes(index);
          const isActiveStep = index === currentActiveStepIndex && isActive;
          const isLocked = index > currentActiveStepIndex || !isActive;

          // --- EXTRACT TITLE & RAW TEXT ---
          const { title, text: rawStepText } = extractTitleAndText(step);
          const stepTitle = title || deriveFallbackTitle(rawStepText);
          const hasChecklist = rawStepText.includes('[CHECKLIST:');
          const isChecklistComplete = getVariable(`step_${index}_checklist_completed`) === true;
          const isCompleteDisabled = hasChecklist && !isChecklistComplete;
          // Split ONLY the text that no longer contains the [TITLE:] tag
          const parsed = rawStepText.split(/(\[[A-Z_]+:.*?\])/g);
          const isStepValid = getVariable(`step_${index}_valid`) ?? true;
          return (
            
            <View
              key={index}
              onLayout={(event) => onStepLayout?.(index, event.nativeEvent.layout.y)}
            >
              <QuestStepCard 
                stepIndex={index}
                totalSteps={quest.steps.length}
                isActiveStep={isActiveStep}
                isCompleted={isCompleted}
                isLocked={isLocked && !isCompleted}
                isExpanded={expandedStepIndex === index}
                isCompleteDisabled={!isStepValid}
                accent={quest.accent}
                title={stepTitle}
                onToggleExpanded={() => onExpandedStepChange?.(expandedStepIndex === index ? null : index)}
                onComplete={() => { if (onToggleStep) onToggleStep(index); }}
      
              >
                <View className="flex-col w-full">
                  
                  {(() => {
                    const blocks: React.ReactNode[] = [];
                    let currentInline: React.ReactNode[] = [];

                    const flushInline = () => {
                      if (currentInline.length > 0) {
                        blocks.push(
                          <AppText key={`inline-${blocks.length}`} className="font-sans text-base leading-8 text-ink/80">
                            {currentInline}
                          </AppText>
                        );
                        currentInline = [];
                      }
                    };

                    parsed.forEach((part, i) => {
                      if (part.startsWith('[YOUTUBE:')) {
                        flushInline(); 
                        const raw = part.slice(9, -1); 
                        blocks.push(<YouTubeWidget key={`yt-${i}`} config={raw} />);
                      } else if (part.startsWith("[LOCATION:")) {
                        flushInline(); 
                        const raw = part.slice(10, -1);
                        blocks.push(<LocationWidget key={`loc-${i}`} config={raw as any} accent={accent} />);
                      } else if (part.startsWith('[RANDOMISER:')) {
                        flushInline();
                        const raw = part.slice(12, -1);
                        blocks.push(<RandomiserWidget key={`rand-${i}`} config={raw as any} accent={quest.accent} />);
                      } else if (part.startsWith("[LINK:")) {
                        flushInline();
                        const raw = part.slice(6, -1);
                        blocks.push(<LinkWidget key={`link-${i}`} config={raw} />);
                      } else if (part.startsWith('[CHECKLIST:')) { 
                        flushInline();
                        const raw = part.slice(11, -1);
                        blocks.push(<ChecklistWidget key={`chk-${i}`} config={raw} stepIndex={index} />);
                      } else if (part.startsWith('[MAP:')) {
                        flushInline();
                        const raw = part.slice(5, -1);
                        blocks.push(<MapWidget key={`map-${i}`} config={raw} />);
                      } else if (part.startsWith('[CARD_REVEAL:')) {
                        flushInline();
                        const raw = part.slice(13, -1);
                        blocks.push(<CardRevealWidget key={`cardrev-${i}`} config={raw} stepIndex={index} chunkIndex={i} />);
                      }
                      else if (part !== "") {
                        currentInline.push(<AppText key={`text-${i}`} className="text-ink/80">{part}</AppText>);
                      }
                    });

                    flushInline(); 
                    return blocks;
                  })()}
                </View>
              </QuestStepCard>
            </View>
          );
        })}
      </View>
    </View>
  );
}
