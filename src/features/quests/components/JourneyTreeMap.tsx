import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, View } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line } from "react-native-svg";
import { AppText } from "../../../shared/components/AppText";
import { useThemeColors } from "../../../shared/design/useThemeColors";
import { JourneyIcon } from "./JourneyIcon";
import type { Journey, LoreEntry, Quest } from "../../../shared/types/domain";
import { getJourneyColorScheme } from "../constants/journeyColorSchemes";
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
  onEntryPress?: (entry: LoreEntry) => void;
  onJourneyPress?: (journeyId: string) => void;
  onSaveQuest?: (quest: Quest) => void;
  savedQuestIds?: string[];
  completedLoreEntries?: LoreEntry[];
  onAddNode?: (parentNode: JourneyTreeRenderNode | null, placement?: "linear" | "branch") => void;
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
const DEFAULT_SCALE = 0.72;
const SELECTED_NODE_ZOOM_SCALE = 1.00;
const SELECTED_NODE_FOCUS_Y_RATIO = 0.4;
const MIN_SCALE = 0.42;
const MAX_SCALE = 1.6;

function clampScale(value: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

function getTouchDistance(touches: Array<{ pageX: number; pageY: number }>) {
  if (touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function collectConnectedNodeIds(
  nodeId: string,
  edges: Array<{ fromNodeId: string; toNodeId: string }>,
  direction: "ancestors" | "descendants",
  collected = new Set<string>()
) {
  edges
    .filter((edge) => direction === "ancestors" ? edge.toNodeId === nodeId : edge.fromNodeId === nodeId)
    .forEach((edge) => {
      const nextNodeId = direction === "ancestors" ? edge.fromNodeId : edge.toNodeId;
      if (collected.has(nextNodeId)) return;
      collected.add(nextNodeId);
      collectConnectedNodeIds(nextNodeId, edges, direction, collected);
    });

  return collected;
}

function parseImageContentPosition(value?: string | null) {
  const match = value?.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!match) return { left: "50%", top: "50%" };

  return {
    left: `${match[1]}%`,
    top: `${match[2]}%`
  };
}

function NodeIcon({
  node,
  size = 22,
  color,
  iconStyle
}: {
  node: JourneyTreeRenderNode;
  size?: number;
  color?: string;
  iconStyle?: StyleProp<TextStyle>;
}) {
  const visualState = node.state;
  const tone = stateTone[visualState];
  const iconColor = color ?? tone.icon;

  if (visualState === "completed") {
    return <Ionicons name="checkmark" size={size} color={iconColor} style={iconStyle} />;
  }
  if (visualState === "locked" || visualState === "hidden") {
    return <Ionicons name="lock-closed" size={size} color={iconColor} style={iconStyle} />;
  }
  if (node.kind === "capability") {
    return <JourneyIcon name={node.iconName || "ribbon-outline"} size={size} color={iconColor} style={iconStyle} />;
  }

  if (node.questJourneyCount > 1) {
    return <Ionicons name="star" size={size - 1} color={iconColor} style={iconStyle} />;
  }

  return <JourneyIcon name={node.journeyIconName} size={size} color={iconColor} style={iconStyle} />;
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
      hitSlop={14}
      onPressIn={(event) => {
        event.stopPropagation();
      }}
      onPress={(event) => {
        event.stopPropagation();
        console.log("[JourneyTreeMap] plus node clicked", { label, x, y });
        onPress();
      }}
      className="absolute items-center justify-center rounded-full border-2 border-dashed border-orange bg-surface shadow-sm"
      style={{ left: x - 23, top: y - 23, width: 46, height: 46, zIndex: 1000, elevation: 20 }}
    >
      <Ionicons name="add" size={24} color="#C76F22" />
    </Pressable>
  );
}

function NodeButton({
  node,
  builderMode,
  isSelected,
  isDimmed,
  onPress
}: {
  node: JourneyTreeRenderNode;
  builderMode: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  onPress: () => void;
}) {
  const visualState = builderMode && node.state !== "completed" ? "available" : node.state;
  const scheme = getJourneyColorScheme(node.journeyColorSchemeId);
  const isLocked = visualState === "locked" || visualState === "hidden";
  const isCompleted = visualState === "completed";
  const isActive = visualState === "active" || visualState === "partially_completed";
  const stateOpacity = visualState === "hidden" ? 0.24 : 1;
  const size = node.kind === "capability" ? 62 : 56;
  const radius = size / 2;
  const rimInset = Math.max(5, size * 0.1);
  const imageInset = Math.max(9, size * 0.16);
  const imageSize = size - imageInset * 2;
  const imageRadius = imageSize / 2;
  const iconContainerSize = Math.round(size * 0.43);
  const iconSize = Math.round(iconContainerSize * 0.58);
  const progressInset = Math.max(3, size * 0.055);

  const imagePosition = parseImageContentPosition(node.quest?.imagePosition || "50% 50%");
  const selectedScale = useRef(new Animated.Value(isSelected ? 1.3 : 1)).current;
  useEffect(() => {
    Animated.timing(selectedScale, {
      toValue: isSelected ? 1.3 : 1,
      duration: 180,
      useNativeDriver: true
    }).start();
  }, [isSelected, selectedScale]);
  return (
    <Pressable
      disabled={!builderMode && visualState === "hidden"}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      accessibilityLabel={node.label}
      className="absolute items-center justify-center"
      style={{
        left: node.x - size / 2,
        top: node.y - size / 2,
        width: size,
        height: size,
        borderRadius: radius,
        zIndex: isSelected ? 90 : 60,
        elevation: isSelected ? 10 : 6
      }}
    >
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: isLocked ? "#747474" : scheme.rimDark,
          opacity: isDimmed ? 0.28 : stateOpacity,
          shadowColor: isSelected ? scheme.glow : "#000000",
shadowOpacity: isSelected ? 0.75 : 0.34,
shadowRadius: isSelected ? 10 : 7,
shadowOffset: { width: 0, height: isSelected ? 4 : 6 },
elevation: isSelected ? 12 : 7,
          transform: [{ scale: selectedScale }],
        } as any}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: Math.max(4, size * 0.09),
            borderColor: isLocked ? "#8E8E8E" : scheme.rim,
            backgroundColor: isLocked ? "#5E5E5E" : scheme.rimDark,
            zIndex: 1,
            overflow: "hidden"
          }}
        />
        {/* Lower side */}
{!isCompleted ? (
  <View
    pointerEvents="none"
    style={{
      position: "absolute",
      left: 0,
      top: size * 0.14,
      width: size,
      height: size,
      borderRadius: radius,
      backgroundColor: isLocked ? "#3F3F3F" : scheme.rimDark,
      zIndex: 0,
      elevation: 0
    }}
  />
) : null}

{/* Top face */}
<View
  pointerEvents="none"
  style={{
    position: "absolute",
    left: 0,
    top: 0,
    width: size,
    height: size,
    borderRadius: radius,
    borderWidth: Math.max(4, size * 0.09),
    borderColor: isLocked ? "#8E8E8E" : scheme.rim,
    backgroundColor: isLocked ? "#5E5E5E" : scheme.rimDark,
    zIndex: 1
  }}
/>
        <View
          style={{
            position: "absolute",
            left: rimInset,
            top: rimInset,
            width: size - rimInset * 2,
            height: size - rimInset * 2,
            borderRadius: (size - rimInset * 2) / 2,
            borderWidth: 1,
            borderColor: isLocked ? "rgba(255,255,255,0.28)" : scheme.rimLight,
            opacity: isLocked ? 0.72 : 0.95,
            zIndex: 2
          }}
        />
        <View
          style={{
            position: "absolute",
            left: imageInset,
            top: imageInset,
            width: imageSize,
            height: imageSize,
            borderRadius: imageRadius,
            overflow: "hidden",
            zIndex: 2
          }}
        >
          <Image
            source={{ uri: node.quest?.imageUrl || node.journeyImageUrl }}
            contentFit="cover"
            contentPosition={imagePosition as any}
            style={{
              width: imageSize,
              height: imageSize,
              opacity: isLocked ? 0.54 : isCompleted ? 0.5 : 0.9,
              zIndex: 2
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            left: imageInset,
            top: imageInset,
            width: imageSize,
            height: imageSize,
            borderRadius: imageRadius,
            backgroundColor: isLocked
              ? "rgba(80,80,80,0.42)"
              : isCompleted
                ? `${scheme.rim}66`
                : "rgba(0,0,0,0.04)",
                zIndex: 2
          }}
        />
        {isSelected ? (
          <View
            style={{
              position: "absolute",
              left: 1,
              top: 1,
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.5,
              borderColor: scheme.rimLight,
              zIndex: 2
            }}
          />
        ) : null}
        {isActive ? (
  <Svg
    pointerEvents="none"
    width={size}
    height={size}
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      transform: [{ rotate: "-90deg" }],
      zIndex: 2
    }}
  >
    <Circle
      cx={radius}
      cy={radius}
      r={radius - progressInset - 1}
      fill="none"
      stroke={scheme.progress}
      strokeWidth={Math.max(3, size * 0.065)}
      strokeLinecap="round"
      strokeDasharray={`${2 * Math.PI * (radius - progressInset - 1)}`}
      strokeDashoffset={
        2 *
        Math.PI *
        (radius - progressInset - 1) *
        (1 - Math.max(0, Math.min(1, node.activeProgress)))
      }
    />
  </Svg>
) : null}
        <Animated.View
          className="items-center justify-center"
          style={{
            width: iconContainerSize,
            height: iconContainerSize,
            borderRadius: iconContainerSize / 2,
            overflow: "hidden",
            borderWidth: Math.max(2, size * 0.05),
            borderColor: isLocked ? "#8A8A8A" : "#38332E",
            backgroundColor: isLocked ? "#D7D7D7" : "#FAFAFA",
            shadowColor: "#000000",
shadowOpacity: 0.34,
shadowRadius: 4,
shadowOffset: { width: 0, height: 3 },
elevation: 5,
            zIndex: 2
          } as any}
        >
          <NodeIcon
            node={{ ...node, state: visualState }}
            size={iconSize}
            color={isLocked ? "#777777" : isCompleted ? scheme.rim : "#373431"}
            iconStyle={{
              width: iconSize,
              height: iconSize,
              lineHeight: iconSize,
              textAlign: "center",
              transform: [{ translateX: 2.7 }, { translateY: 2.5 }]
            }}
          />
        </Animated.View>
        {visualState === "newly_unlocked" ? (
          <View className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-surface bg-orange" />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function QuestPopup({
  node,
  viewport,
  savedQuestIds = [],
  completedLoreEntries = [],
  onQuestPress,
  onEntryPress,
  onJourneyPress,
  onSaveQuest
}: {
  node: JourneyTreeRenderNode;
  viewport: { width: number; height: number };
  savedQuestIds?: string[];
  completedLoreEntries?: LoreEntry[];
  onQuestPress?: (quest: Quest) => void;
  onEntryPress?: (entry: LoreEntry) => void;
  onJourneyPress?: (journeyId: string) => void;
  onSaveQuest?: (quest: Quest) => void;
}) {
  const colors = useThemeColors();
  const quest = node.quest;
  const scheme = getJourneyColorScheme(node.journeyColorSchemeId);
  const isLocked = node.state === "locked" || node.state === "hidden";
  const completedEntry = quest
    ? completedLoreEntries.find((entry) =>
        entry.questId === quest.id || entry.autoCompletedQuests?.some((completedQuest) => completedQuest.id === quest.id)
      )
    : undefined;
  const isCompleted = node.state === "completed" || !!completedEntry;
  const isSaved = quest ? savedQuestIds.includes(quest.id) : false;
  const popupWidth = Math.min(Math.max(viewport.width - 32, 300), 520);
  const isCompact = popupWidth < 430;
  const popupLeft = Math.max((viewport.width - popupWidth) / 2, 8);
  const imageSize = isCompact ? 92 : 170;
  const panelPadding = isCompact ? 12 : 18;
  const panelHeight = imageSize + panelPadding * 2;
  const popupTop = Math.min(viewport.height - panelHeight, viewport.height * SELECTED_NODE_FOCUS_Y_RATIO + 44);
  const progressTotal = Math.max(node.journeyTotalCount || 1, 1);
  const progressCompleted = Math.min(node.journeyCompletedCount || 0, progressTotal);
  const progressSegments = Array.from({ length: progressTotal });
  const buttonLabel = isCompleted ? "View Entry" : "View Quest";
  const canOpenAction = !!quest && !isLocked && (!isCompleted || !!completedEntry || !onEntryPress);

  const handleActionPress = () => {
    if (!quest || isLocked) return;
    if (isCompleted && completedEntry && onEntryPress) {
      onEntryPress(completedEntry);
      return;
    }
    onQuestPress?.(quest);
  };

  return (
    <View
      className="absolute flex-row border shadow-lg"
      style={{
        left: popupLeft,
        top: Math.max(popupTop, 8),
        width: popupWidth,
        height: panelHeight,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: "#0A3830",
        backgroundColor: colors.background,
        padding: panelPadding,
        zIndex: 110,
        elevation: 24,
        gap: isCompact ? 12 : 16
      }}
    >
      {quest?.imageUrl ? (
        <Image
          source={{ uri: quest.imageUrl }}
          contentFit="cover"
          contentPosition={parseImageContentPosition(quest.imagePosition || "50% 50%") as any}
          style={{
            width: imageSize,
            height: imageSize,
            maxWidth: popupWidth * (isCompact ? 0.38 : 0.43),
            borderRadius: 16,
            backgroundColor: "#123832"
          }}
        />
      ) : null}

      <View className="flex-1">
        <View className="flex-row items-start">
          <View className="flex-1 pr-4">
            <AppText
              className="font-serifSemi text-[18px] leading-[22px] text-[#F5F0E7]"
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {node.label}
            </AppText>
            {isCompleted ? (
              <AppText className="text-[11px] uppercase leading-4 text-[#F5F0E7]" style={{ paddingVertical: 1 }}>
                COMPLETED
              </AppText>
            ) : quest ? (
              <AppText className="mt-0.5 text-[12px] leading-4 text-[#F5F0E7]/65" numberOfLines={1} adjustsFontSizeToFit>
                {quest.duration} • {quest.cost} • {quest.difficulty}
              </AppText>
            ) : null}
          </View>
          {quest ? (
            <Pressable
              accessibilityLabel={isCompleted ? "Completed" : isSaved ? "Unsave quest" : "Save quest"}
              disabled={isCompleted || !onSaveQuest}
              onPress={() => onSaveQuest?.(quest)}
              className="items-center justify-center"
              style={{
                width: isCompleted ? 30 : 32,
                height: isCompleted ? 30 : 30,
                borderRadius: isCompleted ? 15 : 0,
                backgroundColor: isCompleted ? scheme.rim : "transparent"
              }}
            >
              <Ionicons
                name={isCompleted ? "checkmark" : isSaved ? "bookmark" : "bookmark-outline"}
                size={isCompleted ? 22 : 31}
                color={isCompleted ? "#F5F0E7" : "#C6C6BC"}
              />
            </Pressable>
          ) : null}
        </View>

        <View className="my-0.5 h-px bg-[#F5F0E7]/55" />

        <View className="flex-row items-center">
          <View className="mr-1.5 h-5 w-5 items-center justify-center rounded-full border-2 border-[#F5F0E7] bg-[#8D9E7F]">
            <Ionicons name="compass-outline" size={12} color="#F5F0E7" />
          </View>
          <AppText className="text-[11px] uppercase leading-4 text-[#F5F0E7]/70">
            PART OF
          </AppText>
        </View>

        <Pressable
          disabled={!onJourneyPress}
          onPress={() => onJourneyPress?.(node.journeyId)}
          className="mt-1 flex-row items-center"
        >
          <AppText className="font-serifSemi text-[16px] leading-5 text-[#F5F0E7]" numberOfLines={1} adjustsFontSizeToFit>
            {node.journeyTitle}
          </AppText>
          <Ionicons name="arrow-forward" size={17} color="#F5F0E7" style={{ marginLeft: 6 }} />
        </Pressable>

        <View className="mt-1.5 flex-row gap-1" style={{ width: 204, maxWidth: "100%" }}>
          {progressSegments.map((_, index) => (
            <View
              key={`${node.id}-progress-${index}`}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 4,
                backgroundColor: index < progressCompleted ? "#E6D1B5" : "#30433E"
              }}
            />
          ))}
        </View>

        {quest ? (
          <View
            style={{
              marginTop: 12,
              borderRadius: 15,
              backgroundColor: isLocked ? "#3F3F3F" : scheme.rimDark,
              paddingBottom: 6,
              elevation: 8,
              opacity: canOpenAction ? 1 : 0.58
            } as any}
          >
            <Pressable
              disabled={!canOpenAction}
              onPress={handleActionPress}
              className="flex-row items-center justify-center"
              style={{
                minHeight: 42,
                borderRadius: 15,
                backgroundColor: isLocked ? "#5E635D" : scheme.rim
              }}
            >
              <AppText className="font-sansSemi text-[15px] leading-5 text-[#FFFFFF]">
                {buttonLabel}
              </AppText>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 30 }} />
            </Pressable>
          </View>
        ) : null}
      </View>
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
  onEntryPress,
  onJourneyPress,
  onSaveQuest,
  savedQuestIds,
  completedLoreEntries,
  onAddNode,
  height = 520
}: JourneyTreeMapProps) {
  const colors = useThemeColors();
  const [viewport, setViewport] = useState({ width: 360, height });
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(DEFAULT_SCALE)).current;
  const scaleRef = useRef(DEFAULT_SCALE);
  const pinchDistanceRef = useRef(0);
  const pinchScaleRef = useRef(DEFAULT_SCALE);
  const panOffsetAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const questById = useMemo(() => new Map(quests.map((quest) => [quest.id, quest])), [quests]);
  const isSelectionControlled = selectedNodeId !== undefined;
  const focusedNodeId = isSelectionControlled ? selectedNodeId : internalSelectedNodeId;
  const model = useMemo(
    () => buildJourneyTreeRenderModel({ journeys, questById, progress, focusedNodeId }),
    [focusedNodeId, journeys, progress, questById]
  );
  const selectedNode = focusedNodeId ? model.nodes.find((node) => node.id === focusedNodeId) : null;
  const translateX = Animated.add(
    Animated.add(panOffsetAnim.x, viewport.width / 2),
    Animated.multiply(scaleAnim, -model.center.x)
  );
  const translateY = Animated.add(
    Animated.add(panOffsetAnim.y, viewport.height / 2),
    Animated.multiply(scaleAnim, -model.center.y)
  );
  const updateScale = (nextScale: number) => {
    const clampedScale = clampScale(nextScale);
    scaleRef.current = clampedScale;
    scaleAnim.setValue(clampedScale);
  };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (event, gestureState) =>
          event.nativeEvent.touches.length > 1 ||
          Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
        onMoveShouldSetPanResponder: (event, gestureState) =>
          event.nativeEvent.touches.length > 1 ||
          Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches;
          scaleAnim.stopAnimation((value) => {
            scaleRef.current = value;
          });
          panOffsetAnim.stopAnimation((value) => {
            panOffsetRef.current = value;
            panStartRef.current = value;
          });
          if (touches.length > 1) {
            pinchDistanceRef.current = getTouchDistance(touches);
            pinchScaleRef.current = scaleRef.current;
          }
        },
        onPanResponderMove: (event, gestureState) => {
          const touches = event.nativeEvent.touches;
          if (touches.length > 1) {
            const nextDistance = getTouchDistance(touches);
            if (pinchDistanceRef.current > 0) {
              const pinchRatio = nextDistance / pinchDistanceRef.current;
              updateScale(pinchScaleRef.current * (1 + (pinchRatio - 1) * 0.5));
            }
            return;
          }
          const nextOffset = {
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy
          };
          panOffsetRef.current = nextOffset;
          panOffsetAnim.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextOffset = {
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy
          };
          panOffsetRef.current = nextOffset;
          panOffsetAnim.setValue(nextOffset);
        },
        onPanResponderTerminate: (_, gestureState) => {
          const nextOffset = {
            x: panStartRef.current.x + gestureState.dx,
            y: panStartRef.current.y + gestureState.dy
          };
          panOffsetRef.current = nextOffset;
          panOffsetAnim.setValue(nextOffset);
        }
      }),
    [panOffsetAnim, scaleAnim]
  );
  const handleWheel = (event: { preventDefault?: () => void; deltaY?: number; nativeEvent?: { deltaY?: number } }) => {
    event.preventDefault?.();
    const deltaY = event.deltaY ?? event.nativeEvent?.deltaY ?? 0;
    updateScale(scaleRef.current * (deltaY > 0 ? 0.96 : 1.04));
  };
  const relatedNodeIds = focusedNodeId
    ? new Set([
        focusedNodeId,
        ...collectConnectedNodeIds(focusedNodeId, model.edges, "ancestors"),
        ...collectConnectedNodeIds(focusedNodeId, model.edges, "descendants")
      ])
    : null;
  const unlockedNodeIds = new Set(
    model.nodes
      .filter((node) => node.state !== "hidden" && node.state !== "locked")
      .map((node) => node.id)
  );
  const previewLockedNodeIds = new Set(
    model.edges
      .filter((edge) => edge.from && edge.to?.state === "locked" && unlockedNodeIds.has(edge.from.id))
      .map((edge) => edge.toNodeId)
  );
  const userVisibleNodeIds = new Set([...unlockedNodeIds, ...previewLockedNodeIds]);
  const visibleNodes = model.nodes.filter((node) => builderMode || userVisibleNodeIds.has(node.id));
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const outgoingNodeIds = new Set(model.edges.map((edge) => edge.fromNodeId));
  const addableNodes = visibleNodes.filter((node) => node.kind === "quest");
  const rootPlusAngle = -38;
  const rootPlusX = model.center.x + Math.cos((rootPlusAngle * Math.PI) / 180) * model.ringRadius;
  const rootPlusY = model.center.y + Math.sin((rootPlusAngle * Math.PI) / 180) * model.ringRadius;
  const addButtons = addableNodes.map((node, index) => {
    const isEndpoint = !outgoingNodeIds.has(node.id);
    const addAngle = isEndpoint ? node.angle : node.angle + (index % 2 === 0 ? 28 : -28);
    const radians = (addAngle * Math.PI) / 180;
    return {
      node,
      placement: isEndpoint ? "linear" as const : "branch" as const,
      x: node.x + Math.cos(radians) * 86,
      y: node.y + Math.sin(radians) * 86
    };
  });
  const handleSelect = (node: JourneyTreeRenderNode) => {
    const nextScale = clampScale(SELECTED_NODE_ZOOM_SCALE);
    const nextOffset = {
      x: (model.center.x - node.x) * nextScale,
      y: (model.center.y - node.y) * nextScale - viewport.height * (0.5 - SELECTED_NODE_FOCUS_Y_RATIO)
    };
    scaleRef.current = nextScale;
    panOffsetRef.current = nextOffset;
    Animated.parallel([
      Animated.timing(panOffsetAnim, {
        toValue: nextOffset,
        duration: 280,
        useNativeDriver: false
      }),
      Animated.timing(scaleAnim, {
        toValue: nextScale,
        duration: 280,
        useNativeDriver: false
      })
    ]).start();
    setInternalSelectedNodeId(node.id);
    onSelectNode?.(node);
  };
  const handleDeselect = () => {
    setInternalSelectedNodeId(null);
    onDeselectNode?.();
  };

  return (
    <View
      className="relative overflow-hidden border-y border-line/40"
      style={{ height, backgroundColor: colors.background }}
      {...panResponder.panHandlers}
      {...({ onWheel: handleWheel } as any)}
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
      <Animated.View
        className="absolute"
        style={{
          width: model.width,
          height: model.height,
          transformOrigin: "0 0",
          transform: [{ translateX }, { translateY }, { scale: scaleAnim }]
        } as any}
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
            if (!builderMode && (!visibleNodeIds.has(edge.from.id) || !visibleNodeIds.has(edge.to.id))) return null;
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
          {builderMode && onAddNode ? (
            <>
              <Line
                x1={model.center.x}
                y1={model.center.y}
                x2={rootPlusX}
                y2={rootPlusY}
                stroke="#C76F22"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="4 9"
                opacity={0.55}
              />
              {addButtons.map(({ node, x, y }) => (
                <Line
                  key={`add-line-${node.id}`}
                  x1={node.x}
                  y1={node.y}
                  x2={x}
                  y2={y}
                  stroke="#C76F22"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="4 9"
                  opacity={0.55}
                />
              ))}
            </>
          ) : null}
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
              builderMode={builderMode}
              isSelected={isSelected}
              isDimmed={isDimmed}
              onPress={() => handleSelect(node)}
            />
          );
        })}

        {builderMode && onAddNode ? (
          <>
            <AddNodeButton x={rootPlusX} y={rootPlusY} label="Add first quest to journey ring" onPress={() => onAddNode(null, "linear")} />
            {addButtons.map(({ node, placement, x, y }) => {
              return (
                <AddNodeButton
                  key={`add-${node.id}`}
                  x={x}
                  y={y}
                  label={`Add quest after ${node.label}`}
                  onPress={() => onAddNode(node, placement)}
                />
              );
            })}
          </>
        ) : null}
      </Animated.View>

      {selectedNode ? (
        <QuestPopup
          node={selectedNode}
          viewport={viewport}
          savedQuestIds={savedQuestIds}
          completedLoreEntries={completedLoreEntries}
          onQuestPress={onQuestPress}
          onEntryPress={onEntryPress}
          onJourneyPress={onJourneyPress}
          onSaveQuest={onSaveQuest}
        />
      ) : null}
    </View>
  );
}
