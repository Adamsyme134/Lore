import { View } from "react-native";
import type { Quest, QuestCollection } from "../../../../shared/types/domain";
import { AppText } from "../../../../shared/components/AppText";
import { CollectionCard } from "../CollectionCard";

type CollectionLinkWidgetProps = {
  config: string;
  collections?: QuestCollection[];
  quests?: Quest[];
  completedQuestIds?: Set<string>;
  width: number;
};

const parseConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split("&").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      const k = pair.substring(0, idx);
      const v = pair.substring(idx + 1);
      if (k) obj[k] = decodeURIComponent(v || "");
    }
  });
  return obj;
};

export function CollectionLinkWidget({
  config,
  collections = [],
  quests = [],
  completedQuestIds = new Set<string>(),
  width
}: CollectionLinkWidgetProps) {
  const cfg = parseConfig(config);
  const linkedCollection = collections.find((collection) => collection.id === cfg.collectionId || collection.slug === cfg.collectionId);

  if (!linkedCollection) {
    return (
      <View
        className="my-3 w-full items-center justify-center rounded-xl border border-dashed border-line bg-stone"
        style={{ height: 132 }}
      >
        <AppText className="text-ink/50">Choose a collection</AppText>
      </View>
    );
  }

  return (
    <View className="my-3">
      <CollectionCard
        collection={linkedCollection}
        quests={quests}
        completedQuestIds={completedQuestIds}
        width={width}
      />
    </View>
  );
}
