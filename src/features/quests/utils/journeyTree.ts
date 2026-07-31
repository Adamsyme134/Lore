import type {
  Journey,
  JourneyRequirementSet,
  JourneyTreeEdge,
  JourneyTreeNode,
  Quest
} from "../../../shared/types/domain";

export type JourneyNodeProgressState =
  | "hidden"
  | "locked"
  | "available"
  | "active"
  | "completed"
  | "partially_completed"
  | "newly_unlocked";

export type JourneyTreeRenderNode = JourneyTreeNode & {
  journeyId: string;
  journeyTitle: string;
  journeyIconName?: string;
  journeyColorSchemeId?: Journey["colorSchemeId"];
  journeyImageUrl?: string;
  questJourneyCount: number;
  quest?: Quest;
  label: string;
  state: JourneyNodeProgressState;
  activeProgress: number;
  x: number;
  y: number;
  depth: number;
  angle: number;
  isRoot: boolean;
};

export type JourneyTreeRenderEdge = JourneyTreeEdge & {
  journeyId: string;
  from?: JourneyTreeRenderNode;
  to?: JourneyTreeRenderNode;
  isDimmed: boolean;
};

export type JourneyTreeRenderModel = {
  nodes: JourneyTreeRenderNode[];
  edges: JourneyTreeRenderEdge[];
  width: number;
  height: number;
  center: { x: number; y: number };
  ringRadius: number;
};

export type JourneyTreeProgressInput = {
  completedQuestIds?: Set<string>;
  activeQuestIds?: Set<string>;
  partiallyCompletedQuestIds?: Set<string>;
  completedStepIndexesByQuestId?: Record<string, number[]>;
  completedJourneyIds?: Set<string>;
  unlockedCapabilityIds?: Set<string>;
  newlyUnlockedNodeIds?: Set<string>;
};

function getJourneyTreeQuestIds(journey: Journey, questById: Map<string, Quest>) {
  const { nodes, edges } = getJourneyTree(journey, questById);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childNodeIds = new Set(edges.map((edge) => edge.toNodeId));
  const childrenByNodeId = new Map<string, JourneyTreeNode[]>();
  edges.forEach((edge) => {
    const child = nodesById.get(edge.toNodeId);
    if (!child) return;
    childrenByNodeId.set(edge.fromNodeId, [...(childrenByNodeId.get(edge.fromNodeId) ?? []), child]);
  });

  const orderedQuestIds: string[] = [];
  const visitedNodeIds = new Set<string>();
  const visit = (node: JourneyTreeNode) => {
    if (visitedNodeIds.has(node.id)) return;
    visitedNodeIds.add(node.id);
    if (node.questId) orderedQuestIds.push(node.questId);
    (childrenByNodeId.get(node.id) ?? []).forEach(visit);
  };

  nodes.filter((node) => !childNodeIds.has(node.id)).forEach(visit);
  nodes.forEach(visit);
  return orderedQuestIds;
}

function getGloballyAvailableQuestIds(journeys: Journey[], questById: Map<string, Quest>) {
  const questIds = new Set<string>();

  journeys.forEach((journey) => {
    const journeyQuestIds = getJourneyTreeQuestIds(journey, questById);
    if (journey.visibility !== "exclusive") {
      journeyQuestIds.forEach((questId) => questIds.add(questId));
      return;
    }

    const publicQuestIds = new Set(journey.publicQuestIds ?? []);
    journeyQuestIds
      .filter((questId) => publicQuestIds.has(questId))
      .forEach((questId) => questIds.add(questId));
  });

  return questIds;
}

const DEFAULT_SIZE = 1200;
const CENTER = DEFAULT_SIZE / 2;
const RING_RADIUS = 142;
const DEPTH_GAP = 108;

function getQuestTitle(questId: string | undefined, questById: Map<string, Quest>) {
  if (!questId) return undefined;
  return questById.get(questId)?.title;
}

export function createLinearJourneyTree(journey: Journey, questById: Map<string, Quest>) {
  const questIds = journey.questIds.length
    ? journey.questIds
    : journey.timeline.map((item) => item.questId).filter(Boolean) as string[];

  const nodes: JourneyTreeNode[] = questIds.map((questId, index) => ({
    id: `${journey.id}-node-${questId}`,
    kind: "quest",
    questId,
    title: getQuestTitle(questId, questById) || journey.timeline.find((item) => item.questId === questId)?.title || `Quest ${index + 1}`,
    prerequisites: index > 0
      ? [{ id: `${journey.id}-requires-${questIds[index - 1]}`, mode: "all", questIds: [questIds[index - 1]] }]
      : []
  }));

  const edges: JourneyTreeEdge[] = nodes.slice(1).map((node, index) => ({
    id: `${journey.id}-edge-${nodes[index].id}-${node.id}`,
    fromNodeId: nodes[index].id,
    toNodeId: node.id,
    hiddenUntilUnlocked: true
  }));

  return { nodes, edges };
}

export function getJourneyTree(journey: Journey, questById: Map<string, Quest>) {
  if (journey.treeNodes?.length) {
    return {
      nodes: journey.treeNodes,
      edges: journey.treeEdges ?? []
    };
  }

  return createLinearJourneyTree(journey, questById);
}

function requirementMatches(
  requirement: JourneyRequirementSet,
  progress: JourneyTreeProgressInput
) {
  const completedQuestIds = progress.completedQuestIds ?? new Set<string>();
  const completedJourneyIds = progress.completedJourneyIds ?? new Set<string>();
  const unlockedCapabilityIds = progress.unlockedCapabilityIds ?? new Set<string>();

  const checks = [
    ...(requirement.questIds ?? []).map((id) => completedQuestIds.has(id)),
    ...(requirement.journeyIds ?? []).map((id) => completedJourneyIds.has(id)),
    ...(requirement.capabilityIds ?? []).map((id) => unlockedCapabilityIds.has(id))
  ];

  if (typeof requirement.minimumCompleted === "number") {
    return checks.filter(Boolean).length >= requirement.minimumCompleted;
  }

  if (checks.length === 0) return true;
  return requirement.mode === "any" ? checks.some(Boolean) : checks.every(Boolean);
}

export function areRequirementSetsMet(
  requirements: JourneyRequirementSet[] | undefined,
  progress: JourneyTreeProgressInput
) {
  if (!requirements?.length) return true;
  return requirements.every((requirement) => requirementMatches(requirement, progress));
}

function inferredRequirementsForNode(node: JourneyTreeNode, incomingEdges: JourneyTreeEdge[], nodesById: Map<string, JourneyTreeNode>) {
  const parentQuestIds = incomingEdges
    .map((edge) => nodesById.get(edge.fromNodeId)?.questId)
    .filter(Boolean) as string[];

  if (parentQuestIds.length > 0) {
    return [
      { id: `${node.id}-parents`, mode: "all" as const, questIds: parentQuestIds },
      ...(node.prerequisites ?? []).filter((requirement) => !requirement.questIds?.length)
    ];
  }

  if (node.prerequisites?.length) return node.prerequisites;
  return [];
}

export function resolveJourneyNodeState(
  node: JourneyTreeNode,
  incomingEdges: JourneyTreeEdge[],
  nodesById: Map<string, JourneyTreeNode>,
  progress: JourneyTreeProgressInput,
  globallyAvailableQuestIds = new Set<string>()
): JourneyNodeProgressState {
  const isGloballyAvailableQuest = !!node.questId && globallyAvailableQuestIds.has(node.questId);
  if (!isGloballyAvailableQuest && node.hiddenUntil?.length && !areRequirementSetsMet(node.hiddenUntil, progress)) return "hidden";

  if (node.kind === "quest" && node.questId) {
    if (progress.completedQuestIds?.has(node.questId)) return "completed";
    if (isGloballyAvailableQuest) {
      if (progress.partiallyCompletedQuestIds?.has(node.questId)) return "partially_completed";
      if (progress.activeQuestIds?.has(node.questId)) return "active";
      return progress.newlyUnlockedNodeIds?.has(node.id) ? "newly_unlocked" : "available";
    }
  }

  const requirements = inferredRequirementsForNode(node, incomingEdges, nodesById);
  if (!areRequirementSetsMet(requirements, progress)) return "locked";
  if (node.kind === "quest" && node.questId) {
    if (progress.partiallyCompletedQuestIds?.has(node.questId)) return "partially_completed";
    if (progress.activeQuestIds?.has(node.questId)) return "active";
  }
  if (progress.newlyUnlockedNodeIds?.has(node.id)) return "newly_unlocked";
  return "available";
}

function collectDescendantIds(nodeId: string, edges: JourneyTreeEdge[], collected = new Set<string>()) {
  edges
    .filter((edge) => edge.fromNodeId === nodeId)
    .forEach((edge) => {
      if (collected.has(edge.toNodeId)) return;
      collected.add(edge.toNodeId);
      collectDescendantIds(edge.toNodeId, edges, collected);
    });

  return collected;
}

function collectAncestorIds(nodeId: string, edges: JourneyTreeEdge[], collected = new Set<string>()) {
  edges
    .filter((edge) => edge.toNodeId === nodeId)
    .forEach((edge) => {
      if (collected.has(edge.fromNodeId)) return;
      collected.add(edge.fromNodeId);
      collectAncestorIds(edge.fromNodeId, edges, collected);
    });

  return collected;
}

function assignJourneyPositions({
  journey,
  journeyIndex,
  journeyCount,
  nodes,
  edges,
  questById,
  progress,
  questJourneyCounts,
  externallyAnchoredNodeIds,
  globallyAvailableQuestIds
}: {
  journey: Journey;
  journeyIndex: number;
  journeyCount: number;
  nodes: JourneyTreeNode[];
  edges: JourneyTreeEdge[];
  questById: Map<string, Quest>;
  progress: JourneyTreeProgressInput;
  questJourneyCounts: Map<string, number>;
  externallyAnchoredNodeIds: Set<string>;
  globallyAvailableQuestIds: Set<string>;
}) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const incomingByNode = new Map<string, JourneyTreeEdge[]>();
  edges.forEach((edge) => {
    incomingByNode.set(edge.toNodeId, [...(incomingByNode.get(edge.toNodeId) ?? []), edge]);
  });

  const localNodeIds = new Set(nodes.map((node) => node.id));
  const localIncomingNodeIds = new Set(
    edges
      .filter((edge) => localNodeIds.has(edge.fromNodeId) && localNodeIds.has(edge.toNodeId))
      .map((edge) => edge.toNodeId)
  );
  const externalIncomingNodeIds = new Set(
    edges
      .filter((edge) => !localNodeIds.has(edge.fromNodeId) && localNodeIds.has(edge.toNodeId))
      .map((edge) => edge.toNodeId)
  );
  const externallyAnchoredLocalNodeIds = new Set(
    nodes
      .filter((node) => externallyAnchoredNodeIds.has(node.id) || externalIncomingNodeIds.has(node.id) || !!node.sharedAnchorNodeId)
      .map((node) => node.id)
  );
  const rootNodes = nodes.filter((node) => !localIncomingNodeIds.has(node.id) && !externallyAnchoredLocalNodeIds.has(node.id));
  const externalRootNodes = nodes.filter((node) => externallyAnchoredLocalNodeIds.has(node.id));
  const baseAngle = -90 + (360 / Math.max(journeyCount, 1)) * journeyIndex;
  const depthByNode = new Map<string, number>();
  const angleByNode = new Map<string, number>();

  const visit = (node: JourneyTreeNode, depth: number, angle: number) => {
    const existingDepth = depthByNode.get(node.id);
    if (existingDepth !== undefined && existingDepth <= depth) return;

    depthByNode.set(node.id, depth);
    angleByNode.set(node.id, angle);

    const children = edges
      .filter((edge) => edge.fromNodeId === node.id)
      .map((edge) => nodesById.get(edge.toNodeId))
      .filter(Boolean) as JourneyTreeNode[];
    const spread = Math.min(42, 16 + children.length * 12);

    children.forEach((child, childIndex) => {
      const offset = children.length <= 1
        ? child.branchId === "side-branch" ? 28 : 0
        : -spread / 2 + (spread * childIndex) / (children.length - 1);
      visit(child, depth + 1, angle + offset);
    });
  };

  rootNodes.forEach((node, rootIndex) => {
    const rootOffset = rootNodes.length <= 1 ? 0 : -18 + (36 * rootIndex) / (rootNodes.length - 1);
    visit(node, 0, baseAngle + rootOffset);
  });
  externalRootNodes.forEach((node, rootIndex) => {
    const rootOffset = externalRootNodes.length <= 1 ? 0 : -18 + (36 * rootIndex) / (externalRootNodes.length - 1);
    visit(
      node,
      typeof node.layoutDepth === "number" ? node.layoutDepth : 1,
      typeof node.layoutAngle === "number" ? node.layoutAngle : baseAngle + rootOffset
    );
  });
  if (rootNodes.length === 0 && externalRootNodes.length === 0 && nodes[0]) {
    visit(nodes[0], 0, baseAngle);
  }

  return nodes.map<JourneyTreeRenderNode>((node, index) => {
    const incomingEdges = incomingByNode.get(node.id) ?? [];
    const state = resolveJourneyNodeState(node, incomingEdges, nodesById, progress, globallyAvailableQuestIds);
    const angle = angleByNode.get(node.id) ?? baseAngle + index * 8;
    const depth = depthByNode.get(node.id) ?? 0;
    const radius = RING_RADIUS + depth * DEPTH_GAP + (node.kind === "capability" ? 34 : 0);
    const radians = (angle * Math.PI) / 180;
    const quest = node.questId ? questById.get(node.questId) : undefined;

    return {
      ...node,
      journeyId: journey.id,
      journeyTitle: journey.title,
      journeyIconName: journey.iconName,
      journeyColorSchemeId: journey.colorSchemeId,
      journeyImageUrl: journey.backgroundImageUrl,
      questJourneyCount: node.questId ? questJourneyCounts.get(node.questId) ?? 1 : 1,
      quest,
      label: node.title || quest?.title || (node.kind === "capability" ? "Capability" : "Quest"),
      state,
      activeProgress: node.questId && quest?.steps?.length
        ? Math.min(1, (progress.completedStepIndexesByQuestId?.[node.questId]?.length ?? 0) / quest.steps.length)
        : 0,
      x: CENTER + Math.cos(radians) * radius,
      y: CENTER + Math.sin(radians) * radius,
      depth,
      angle,
      isRoot: incomingEdges.length === 0
    };
  });
}

function placeNodeFromPolar(node: JourneyTreeRenderNode, depth: number, angle: number) {
  const radius = RING_RADIUS + depth * DEPTH_GAP + (node.kind === "capability" ? 34 : 0);
  const radians = (angle * Math.PI) / 180;
  node.depth = depth;
  node.angle = angle;
  node.x = CENTER + Math.cos(radians) * radius;
  node.y = CENTER + Math.sin(radians) * radius;
}

function repositionSubtreeFromParent({
  parent,
  node,
  edgesByParent,
  nodeById,
  angle,
  shareParentPosition = false,
  visited = new Set<string>()
}: {
  parent: JourneyTreeRenderNode;
  node: JourneyTreeRenderNode;
  edgesByParent: Map<string, JourneyTreeEdge[]>;
  nodeById: Map<string, JourneyTreeRenderNode>;
  angle?: number;
  shareParentPosition?: boolean;
  visited?: Set<string>;
}) {
  if (visited.has(node.id)) return;
  visited.add(node.id);

  const nodeAngle = angle ?? parent.angle + (node.branchId === "side-branch" ? 28 : 0);
  if (shareParentPosition) {
    node.depth = parent.depth;
    node.angle = parent.angle;
    node.x = parent.x;
    node.y = parent.y;
  } else {
    placeNodeFromPolar(node, parent.depth + 1, nodeAngle);
  }

  const childEdges = edgesByParent.get(node.id) ?? [];
  const children = childEdges
    .map((edge) => nodeById.get(edge.toNodeId))
    .filter(Boolean) as JourneyTreeRenderNode[];
  const spread = Math.min(42, 16 + children.length * 12);

  children.forEach((child, childIndex) => {
    const childAngle = children.length <= 1
      ? node.angle + (child.branchId === "side-branch" ? 28 : 0)
      : node.angle - spread / 2 + (spread * childIndex) / (children.length - 1);
    repositionSubtreeFromParent({
      parent: node,
      node: child,
      edgesByParent,
      nodeById,
      angle: childAngle,
      visited
    });
  });
}

export function buildJourneyTreeRenderModel({
  journeys,
  questById,
  progress = {},
  focusedNodeId
}: {
  journeys: Journey[];
  questById: Map<string, Quest>;
  progress?: JourneyTreeProgressInput;
  focusedNodeId?: string | null;
}): JourneyTreeRenderModel {
  const activeJourneys = journeys.filter((journey) => journey.isActive);
  const globallyAvailableQuestIds = getGloballyAvailableQuestIds(activeJourneys, questById);
  const treesByJourneyId = new Map(activeJourneys.map((journey) => [journey.id, getJourneyTree(journey, questById)]));
  const allNodeIds = new Set(activeJourneys.flatMap((journey) => treesByJourneyId.get(journey.id)?.nodes.map((node) => node.id) ?? []));
  const nodeJourneyIds = new Map<string, string>();
  activeJourneys.forEach((journey) => {
    treesByJourneyId.get(journey.id)?.nodes.forEach((node) => nodeJourneyIds.set(node.id, journey.id));
  });
  const allEdges = activeJourneys.flatMap((journey) => treesByJourneyId.get(journey.id)?.edges ?? []);
  const externallyAnchoredNodeIds = new Set(
    allEdges
      .filter((edge) => allNodeIds.has(edge.fromNodeId) && allNodeIds.has(edge.toNodeId) && nodeJourneyIds.get(edge.fromNodeId) !== nodeJourneyIds.get(edge.toNodeId))
      .map((edge) => edge.toNodeId)
  );
  const questJourneyCounts = new Map<string, number>();
  activeJourneys.forEach((journey) => {
    const tree = treesByJourneyId.get(journey.id) ?? getJourneyTree(journey, questById);
    const journeyQuestIds = new Set(tree.nodes.map((node) => node.questId).filter(Boolean) as string[]);
    journeyQuestIds.forEach((questId) => {
      questJourneyCounts.set(questId, (questJourneyCounts.get(questId) ?? 0) + 1);
    });
  });
  const renderNodes = activeJourneys.flatMap((journey, index) => {
    const tree = treesByJourneyId.get(journey.id) ?? getJourneyTree(journey, questById);
    return assignJourneyPositions({
      journey,
      journeyIndex: index,
      journeyCount: activeJourneys.length,
      nodes: tree.nodes,
      edges: tree.edges,
      questById,
      progress,
      questJourneyCounts,
      externallyAnchoredNodeIds,
      globallyAvailableQuestIds
    });
  });
  const renderNodeById = new Map(renderNodes.map((node) => [node.id, node]));
  const edgesByParent = new Map<string, JourneyTreeEdge[]>();
  allEdges.forEach((edge) => {
    edgesByParent.set(edge.fromNodeId, [...(edgesByParent.get(edge.fromNodeId) ?? []), edge]);
  });
  renderNodes.forEach((node) => {
    if (!node.sharedAnchorNodeId) return;
    const anchor = renderNodeById.get(node.sharedAnchorNodeId);
    if (!anchor) return;
    repositionSubtreeFromParent({
      parent: anchor,
      node,
      edgesByParent,
      nodeById: renderNodeById,
      shareParentPosition: true
    });
  });
  allEdges.forEach((edge) => {
    const from = renderNodeById.get(edge.fromNodeId);
    const to = renderNodeById.get(edge.toNodeId);
    if (!from || !to || from.journeyId === to.journeyId) return;
    if (to.sharedAnchorNodeId === from.id) return;
    repositionSubtreeFromParent({
      parent: from,
      node: to,
      edgesByParent,
      nodeById: renderNodeById
    });
  });
  const relatedIds = focusedNodeId
    ? new Set([
        focusedNodeId,
        ...collectAncestorIds(focusedNodeId, allEdges),
        ...collectDescendantIds(focusedNodeId, allEdges)
      ])
    : null;

  const renderEdges = activeJourneys.flatMap<JourneyTreeRenderEdge>((journey) => {
    const { edges } = getJourneyTree(journey, questById);
    return edges.map((edge) => {
      const from = renderNodeById.get(edge.fromNodeId);
      const to = renderNodeById.get(edge.toNodeId);
      return {
        ...edge,
        journeyId: journey.id,
        from,
        to,
        isDimmed: !!relatedIds && (!from || !to || (!relatedIds.has(from.id) && !relatedIds.has(to.id)))
      };
    });
  });

  return {
    nodes: renderNodes,
    edges: renderEdges,
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
    center: { x: CENTER, y: CENTER },
    ringRadius: RING_RADIUS
  };
}

export function getJourneyQuestIdsFromTree(journey: Journey, questById: Map<string, Quest>) {
  return getJourneyTreeQuestIds(journey, questById);
}
