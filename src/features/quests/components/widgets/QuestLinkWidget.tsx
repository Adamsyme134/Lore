import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { Quest } from "../../../../shared/types/domain";
import { AppText } from "../../../../shared/components/AppText";

type QuestLinkWidgetProps = {
  config: string;
  quests?: Quest[];
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

export function QuestLinkWidget({ config, quests = [] }: QuestLinkWidgetProps) {
  const cfg = parseConfig(config);
  const linkedQuest = quests.find((quest) => quest.id === cfg.questId || quest.slug === cfg.questId);
  const posMatch = linkedQuest?.imagePosition?.match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  const contentPosition = posMatch
    ? { left: `${posMatch[1]}%`, top: `${posMatch[2]}%` }
    : linkedQuest?.imagePosition || "center";

  return (
    <Pressable
      onPress={() => {
        if (linkedQuest?.id) {
          router.push({ pathname: "/quest/[id]", params: { id: linkedQuest.id } });
        }
      }}
      disabled={!linkedQuest}
      className={`my-3 w-full overflow-hidden rounded-xl border border-line bg-stone shadow-sm active:opacity-80 ${linkedQuest ? "" : "opacity-60"}`}
      style={{ height: 132 }}
    >
      {linkedQuest?.imageUrl ? (
        <Image
          source={{ uri: linkedQuest.imageUrl }}
          style={{ height: "100%", width: "100%" }}
          contentFit="cover"
          contentPosition={contentPosition as any}
        />
      ) : null}

      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.84)"]}
        locations={[0, 1]}
        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4">
        <AppText className="mb-1 text-[10px] font-sansSemi uppercase tracking-widest text-ivory/75">
          Quest
        </AppText>
        <AppText variant="subtitle" className="text-ivory" numberOfLines={2}>
          {linkedQuest?.title || "Choose a quest"}
        </AppText>
      </View>

      <View className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/30">
        <AppText className="text-xl text-ivory">›</AppText>
      </View>
    </Pressable>
  );
}
