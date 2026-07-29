import { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line } from "react-native-svg";
import { AppText } from "../../../shared/components/AppText";
import type { Journey, Quest } from "../../../shared/types/domain";
import {
  buildJourneyTreeRenderModel,
  type JourneyNodeProgressState,
  type JourneyTreeProgressInput,
  type JourneyTreeRenderNode
} from "../utils/journeyTree";

type JourneyTreeMapProps = {
  journeys: Journey[];
  quests: Quest[];
  progress?: JourneyTreeProgressInput;
  builderMode?: boolean;
  selectedNodeId?: string | null;
  onSelectNode?: (node: JourneyTreeRenderNode) => void;
  onDeselectNode?: () => void;
  onQuestPress?: (quest: Quest) => void;
  onAddNode?: (parentNodeId: string | null) => void;
  height?: number;
};

const stateTone: Record<JourneyNodeProgressState, { border: string; fill: string; icon: string; text: string }> = {
  hidden: { border: "#C7C0B5", fill: "#E8E1D8", icon: "#807A70", text: "#807A70" },
  locked: { border: "#BDB4A7", fill: "#DED8CF", icon: "#807A70", text: "#807A70" },
  available: { border: "#F2A65A", fill: "#FFF7EA", icon: "#C76F22", text: "#1C1A17" },
  active: { border: "#386F68", fill: "#E8F3EF", icon: "#386F68", text: "#1C1A17" },
  completed: { border: "#A8D08D", fill: "#DDF2D1", icon: "#183431", text: "#183431" },
  partially_completed: { border: "#D9B66F", fill: "#FFF1C6", icon: "#8A6415", text: "#1C1A17" },
  newly_unlocked: { border: "#F2A65A", fill: "#FFE3B9", icon: "#C76F22", text: "#1C1A17" }
};

function NodeIcon({ node }: { node: JourneyTreeRenderNode }) {
  const tone = stateTone[node.state];

  if (node.state === "completed") {
    return <Ionicons name="checkmark" size={22} color={tone.icon} />;
  }
  if (node.state === "locked" || node.state === "hidden") {
    return <Ionicons name={node.state === "hidden" ? "eye-off-outline" : "lock-closed-outline"} size={19} color={tone.icon} />;
  }
  if (node.kind === "capability") {
    return <Ionicons name={(node.iconName as any) || "ribbon-outline"} size={22} color={tone.icon} />;
  }
  if (node.quest?.categories?.includes("Food & Drink")) {
    return <Ionicons name="cafe-outline" size={21} color={tone.icon} />;
  }
  if (node.quest?.categories?.includes("Skill")) {
    return <Ionicons name="construct-outline" size={21} color={tone.icon} />;
  }
  if (node.quest?.categories?.includes("Culture")) {
    return <Ionicons name="sparkles-outline" size={21} color={tone.icon} />;
  }
  return <Ionicons name="compass-outline" size={22} color={tone.icon} />;
}

function AddNodeButton({
  x,
  y,
  onPress,
  label
}: {
  x: number;
  y: number;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="absolute items-center justify-center rounded-full border-2 border-dashed border-orange bg-surface shadow-sm"
      style={{ left: x - 23, top: y - 23, width: 46, height: 46 }}
    >
      <Ionicons name="add" size={24} color="#C76F22" />
    </Pressable>
  );
}

function NodeButton({
  node,
  isSelected,
  isDimmed,
  onPress
}: {
  node: JourneyTreeRenderNode;
  isSelected: boolean;
  isDimmed: boolean;
  onPress: () => void;
}) {
  const tone = stateTone[node.state];
  const size = node.kind === "capability" ? 62 : 56;
  const radius = node.kind === "capability" ? 14 : size / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={node.label}
      className="absolute items-center justify-center shadow-sm"
      style={{
        left: node.x - size / 2,
        top: node.y - size / 2,
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: isSelected ? 4 : 3,
        borderColor: isSelected ? "#1C1A17" : tone.border,
        backgroundColor: tone.fill,
        opacity: isDimmed ? 0.28 : node.state === "hidden" ? 0.16 : 1
      }}
    >
      <NodeIcon node={node} />
      {node.state === "newly_unlocked" ? (
        <View className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-surface bg-orange" />
      ) : null}
    </Pressable>
  );
}

function QuestPopup({ node, onQuestPress }: { node: JourneyTreeRenderNode; onQuestPress?: (quest: Quest) => void }) {
  const quest = node.quest;

  return (
    <View className="absolute bottom-4 right-4 top-4 w-[250px] rounded-[14px] border border-line bg-surface p-4 shadow-lg">
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-stone">
          <Ionicons name={node.kind === "capability" ? "ribbon-outline" : "compass-outline"} size={20} color="#1C1A17" />
        </View>
        <View className="flex-1">
          <AppText className="text-[10px] uppercase tracking-widest text-ink/50">{node.journeyTitle}</AppText>
          <AppText className="font-sansSemi text-ink" numberOfLines={1}>{node.state.replace("_", " ")}</AppText>
        </View>
      </View>
      {quest?.imageUrl ? <Image source={{ uri: quest.imageUrl }} className="mb-4 h-24 w-full rounded-lg bg-stone" contentFit="cover" /> : null}
      <AppText variant="subtitle" className="text-xl leading-6 text-ink" numberOfLines={3}>
        {node.label}
      </AppText>
      <AppText className="mt-2 text-sm leading-5 text-ink/65" numberOfLines={5}>
        {quest?.description || node.description || "Complete the connected requirements to reveal what this unlocks next."}
      </AppText>
      {quest ? (
        <Pressable
          disabled={node.state === "locked" || node.state === "hidden"}
          onPress={() => onQuestPress?.(quest)}
          className={`mt-auto flex-row items-center justify-center rounded-full px-4 py-3 ${node.state === "locked" || node.state === "hidden" ? "bg-stone" : "bg-accent"}`}
        >
          <AppText className={`font-sansSemi ${node.state === "locked" || node.state === "hidden" ? "text-ink/45" : "text-accentText"}`}>
            Open quest
          </AppText>
          <Ionicons name="chevron-forward" size={17} color={node.state === "locked" || node.state === "hidden" ? "#B0B4B1" : "#183431"} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function JourneyTreeMap({
  journeys,
  quests,
  progress,
  builderMode = false,
  selectedNodeId,
  onSelectNode,
  onDeselectNode,
  onQuestPress,
  onAddNode,
  height = 520
}: JourneyTreeMapProps) {
  const [viewport, setViewport] = useState({ width: 360, height });
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<"overview" | "detail">("overview");
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const focusedNodeId = selectedNodeId ?? internalSelectedNodeId;
  const model = useMemo(
    () => buildJourneyTreeRenderModel({ journeys, questById, progress, focusedNodeId }),
    [focusedNodeId, journeys, progress, questById]
  );
  const selectedNode = focusedNodeId ? model.nodes.find((node) => node.id === focusedNodeId) : null;
  const scale = zoom === "detail" ? 1 : 0.72;
  const translateX = viewport.width / 2 - model.center.x * scale + panOffset.x;
  const translateY = viewport.height / 2 - model.center.y * scale + panOffset.y;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          panStartRef.current = panOffsetRef.current;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = {
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy
          };
          panOffsetRef.current = nextOffset;
          setPanOffset(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextOffset = {
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy
          };
          panOffsetRef.current = nextOffset;
          setPanOffset(nextOffset);
        },
        onPanResponderTerminate: (_, gestureState) => {
          const nextOffset = {
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy
          };
          panOffsetRef.current = nextOffset;
          setPanOffset(nextOffset);
        }
      }),
    []
  );
  const relatedNodeIds = focusedNodeId
    ? new Set([
        focusedNodeId,
        ...model.edges.filter((edge) => edge.from?.id === focusedNodeId).map((edge) => edge.to?.id).filter(Boolean) as string[],
        ...model.edges.filter((edge) => edge.to?.id === focusedNodeId).map((edge) => edge.from?.id).filter(Boolean) as string[]
      ])
    : null;
  const visibleNodes = model.nodes.filter((node) => builderMode || node.state !== "hidden" || relatedNodeIds?.has(node.id));
  const outgoingNodeIds = new Set(model.edges.map((edge) => edge.fromNodeId));
  const terminalNodes = visibleNodes.filter((node) => !outgoingNodeIds.has(node.id));
  const rootPlusAngle = -38;
  const rootPlusX = model.center.x + Math.cos((rootPlusAngle * Math.PI) / 180) * model.ringRadius;
  const rootPlusY = model.center.y + Math.sin((rootPlusAngle * Math.PI) / 180) * model.ringRadius;

  const handleSelect = (node: JourneyTreeRenderNode) => {
    const nextOffset = {
      x: (model.center.x - node.x) * scale - 108,
      y: (model.center.y - node.y) * scale
    };
    panOffsetRef.current = nextOffset;
    setPanOffset(nextOffset);
    setInternalSelectedNodeId(node.id);
    onSelectNode?.(node);
  };
  const handleDeselect = () => {
    setInternalSelectedNodeId(null);
    onDeselectNode?.();
  };

  return (
    <View
      className="relative overflow-hidden border-y border-line/40 bg-[#F7F2EA]"
      style={{ height }}
      {...panResponder.panHandlers}
      onLayout={(event) => {
        const { width, height: nextHeight } = event.nativeEvent.layout;
        setViewport({ width, height: nextHeight });
      }}
    >
      <Pressable
        accessibilityLabel="Deselect journey node"
        onPress={handleDeselect}
        className="absolute inset-0"
      />
      <View className="absolute left-4 top-4 z-20 flex-row rounded-full border border-line bg-surface p-1 shadow-sm">
        {(["overview", "detail"] as const).map((mode) => {
          const isActive = zoom === mode;
          return (
            <Pressable key={mode} onPress={() => setZoom(mode)} className={`rounded-full px-4 py-2 ${isActive ? "bg-accent" : ""}`}>
              <AppText className={`text-xs capitalize ${isActive ? "font-sansSemi text-accentText" : "text-ink/60"}`}>{mode}</AppText>
            </Pressable>
          );
        })}
      </View>

      <View
        className="absolute"
        style={{
          width: model.width,
          height: model.height,
          transform: [{ translateX }, { translateY }, { scale }]
        }}
      >
        <Pressable
          accessibilityLabel="Deselect journey node"
          onPress={handleDeselect}
          className="absolute inset-0"
          style={{ width: model.width, height: model.height }}
        />
        <Svg width={model.width} height={model.height} pointerEvents="none">
          <Circle
            cx={model.center.x}
            cy={model.center.y}
            r={model.ringRadius}
            fill="none"
            stroke="#CFC7BA"
            strokeWidth={2}
            strokeDasharray="6 12"
          />
          <Circle cx={model.center.x} cy={model.center.y} r={34} fill="#F3F0EB" stroke="#D9D0C4" strokeWidth={2} />
          {model.edges.map((edge) => {
            if (!edge.from || !edge.to) return null;
            if (!builderMode && (edge.from.state === "hidden" || edge.to.state === "hidden")) return null;
            return (
              <Line
                key={edge.id}
                x1={edge.from.x}
                y1={edge.from.y}
                x2={edge.to.x}
                y2={edge.to.y}
                stroke={edge.isDimmed ? "#D8D0C5" : "#8F877C"}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="8 12"
                opacity={edge.isDimmed ? 0.25 : 0.82}
              />
            );
          })}
        </Svg>

        <View
          className="absolute items-center justify-center rounded-full border border-line bg-surface"
          style={{ left: model.center.x - 31, top: model.center.y - 31, width: 62, height: 62 }}
        >
          <Ionicons name="person-circle-outline" size={28} color="#386F68" />
          <AppText className="text-[9px] text-ink/50">NOW</AppText>
        </View>

        {visibleNodes.map((node) => {
          const isSelected = focusedNodeId === node.id;
          const isDimmed = !!relatedNodeIds && !relatedNodeIds.has(node.id);
          return (
            <NodeButton
              key={node.id}
              node={node}
              isSelected={isSelected}
              isDimmed={isDimmed}
              onPress={() => handleSelect(node)}
            />
          );
        })}

        {builderMode && onAddNode ? (
          <>
            <AddNodeButton x={rootPlusX} y={rootPlusY} label="Add first quest to journey ring" onPress={() => onAddNode(null)} />
            {terminalNodes.map((node) => {
              const radians = (node.angle * Math.PI) / 180;
              return (
                <AddNodeButton
                  key={`add-${node.id}`}
                  x={node.x + Math.cos(radians) * 92}
                  y={node.y + Math.sin(radians) * 92}
                  label={`Add quest after ${node.label}`}
                  onPress={() => onAddNode(node.id)}
                />
              );
            })}
          </>
        ) : null}
      </View>

      {selectedNode ? <QuestPopup node={selectedNode} onQuestPress={onQuestPress} /> : null}
    </View>
  );
}
