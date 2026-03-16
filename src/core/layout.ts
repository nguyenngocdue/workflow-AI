import { NodeKind, type WorkflowEdge, type WorkflowNode } from "@/src/core/types";

const LEVEL_GAP = 360;
const NODE_PADDING = 120;
const DEFAULT_NODE_HEIGHT = 120;

type PlacedNode = {
  id: string;
  y: number;
  height: number;
  topBound: number;
  bottomBound: number;
};

type NodeToPlace = {
  nodeId: string;
  parentIds: string[];
  originalY: number;
  height: number;
};

export function arrangeNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): {
  nodes: WorkflowNode[];
} {
  const arrangedNodes = nodes.map((node) => ({ ...node }));
  const connectedNodeIds = new Set([
    ...edges.map((edge) => edge.source),
    ...edges.map((edge) => edge.target),
  ]);
  const nodesWithEdges = arrangedNodes.filter((node) => connectedNodeIds.has(node.id));

  const inputNode = nodesWithEdges.find((node) => node.data.kind === NodeKind.Input);
  if (!inputNode) {
    return {
      nodes: arrangedNodes,
    };
  }

  const childrenMap = new Map<string, string[]>();
  const parentsMap = new Map<string, string[]>();

  const sortedEdges = [...edges].sort((a, b) => {
    if (a.source === b.source) {
      return getSourceHandlePriority(a.sourceHandle) - getSourceHandlePriority(b.sourceHandle);
    }
    return 0;
  });

  sortedEdges.forEach((edge) => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    if (!parentsMap.has(edge.target)) {
      parentsMap.set(edge.target, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
    parentsMap.get(edge.target)!.push(edge.source);
  });

  const levels = new Map<string, number>();
  const queue = [{ nodeId: inputNode.id, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) {
      continue;
    }
    visited.add(current.nodeId);
    levels.set(current.nodeId, current.level);

    const children = childrenMap.get(current.nodeId) ?? [];
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({
          nodeId: childId,
          level: current.level + 1,
        });
      }
    });
  }

  const nodePositions = new Map<string, { x: number; y: number }>();
  const maxLevel = Math.max(...levels.values());
  nodePositions.set(inputNode.id, {
    x: 0,
    y: 0,
  });

  for (let level = 1; level <= maxLevel; level += 1) {
    const levelNodes = Array.from(levels.entries())
      .filter(([, nodeLevel]) => nodeLevel === level)
      .map(([nodeId]) => nodeId);

    const parentGroups = new Map<string, NodeToPlace[]>();
    levelNodes.forEach((nodeId) => {
      const parents = parentsMap.get(nodeId) ?? [];
      const parentKey = [...parents].sort().join(",");
      const nodeHeight = getNodeHeight(arrangedNodes.find((node) => node.id === nodeId));
      const originalY =
        arrangedNodes.find((node) => node.id === nodeId)?.position.y ?? 0;

      if (!parentGroups.has(parentKey)) {
        parentGroups.set(parentKey, []);
      }

      parentGroups.get(parentKey)!.push({
        nodeId,
        parentIds: parents,
        originalY,
        height: nodeHeight,
      });
    });

    parentGroups.forEach((groupNodes) => {
      groupNodes.sort((a, b) => a.originalY - b.originalY);
    });

    const sortedParentGroups = Array.from(parentGroups.entries()).sort(
      ([groupA], [groupB]) => {
        const parentsA = groupA ? groupA.split(",") : [];
        const parentsB = groupB ? groupB.split(",") : [];
        return getGroupAverageY(parentsA, nodePositions) - getGroupAverageY(parentsB, nodePositions);
      },
    );

    const placedNodesInLevel: PlacedNode[] = [];
    const x = level * LEVEL_GAP;

    for (const [parentKey, groupNodes] of sortedParentGroups) {
      const parents = parentKey ? parentKey.split(",") : [];

      if (parents.length === 1) {
        const parentPosition = nodePositions.get(parents[0]);
        if (!parentPosition) {
          continue;
        }

        if (groupNodes.length === 1) {
          const nodeToPlace = groupNodes[0];
          const targetY = findNonOverlappingY(
            parentPosition.y,
            nodeToPlace.height,
            placedNodesInLevel,
          );
          nodePositions.set(nodeToPlace.nodeId, { x, y: targetY });
          placedNodesInLevel.push(toPlacedNode(nodeToPlace.nodeId, targetY, nodeToPlace.height));
        } else {
          const totalRequiredHeight = groupNodes.reduce(
            (sum, nodeToPlace) => sum + nodeToPlace.height + NODE_PADDING,
            -NODE_PADDING,
          );
          let startY = parentPosition.y - totalRequiredHeight / 2;
          const adjustedStartY =
            findNonOverlappingY(
              startY + groupNodes[0].height / 2,
              groupNodes[0].height,
              placedNodesInLevel,
            ) -
            groupNodes[0].height / 2;
          startY = adjustedStartY;

          let currentY = startY;
          groupNodes.forEach((nodeToPlace) => {
            const nodeY = currentY + nodeToPlace.height / 2;
            nodePositions.set(nodeToPlace.nodeId, { x, y: nodeY });
            placedNodesInLevel.push(toPlacedNode(nodeToPlace.nodeId, nodeY, nodeToPlace.height));
            currentY += nodeToPlace.height + NODE_PADDING;
          });
        }
      } else if (parents.length > 1) {
        const parentPositions = parents
          .map((parentId) => nodePositions.get(parentId))
          .filter(Boolean)
          .sort((a, b) => a!.y - b!.y);
        if (parentPositions.length === 0) {
          continue;
        }

        groupNodes.forEach((nodeToPlace) => {
          if (nodePositions.has(nodeToPlace.nodeId)) {
            return;
          }
          const targetY = findNonOverlappingY(
            parentPositions[0]!.y,
            nodeToPlace.height,
            placedNodesInLevel,
          );
          nodePositions.set(nodeToPlace.nodeId, { x, y: targetY });
          placedNodesInLevel.push(toPlacedNode(nodeToPlace.nodeId, targetY, nodeToPlace.height));
        });
      }
    }
  }

  arrangedNodes.forEach((node) => {
    const nextPosition = nodePositions.get(node.id);
    if (nextPosition) {
      node.position = nextPosition;
    }
  });

  return { nodes: arrangedNodes };
}

function getSourceHandlePriority(handle: string | null | undefined): number {
  if (!handle) {
    return 0;
  }
  if (handle === "if") {
    return 1;
  }
  if (handle === "elseif") {
    return 2;
  }
  if (handle === "else") {
    return 3;
  }
  return 0;
}

function getNodeHeight(node: WorkflowNode | undefined): number {
  return node?.measured?.height ?? DEFAULT_NODE_HEIGHT;
}

function getGroupAverageY(
  parents: string[],
  nodePositions: Map<string, { x: number; y: number }>,
): number {
  if (parents.length === 0) {
    return 0;
  }
  const parentYs = parents
    .map((parentId) => nodePositions.get(parentId)?.y)
    .filter((value): value is number => value !== undefined);

  if (parentYs.length === 0) {
    return 0;
  }
  return parentYs.reduce((sum, value) => sum + value, 0) / parentYs.length;
}

function toPlacedNode(id: string, y: number, height: number): PlacedNode {
  return {
    id,
    y,
    height,
    topBound: y - height / 2 - NODE_PADDING / 2,
    bottomBound: y + height / 2 + NODE_PADDING / 2,
  };
}

function findNonOverlappingY(
  preferredY: number,
  nodeHeight: number,
  placedNodes: PlacedNode[],
): number {
  const halfHeight = nodeHeight / 2;
  const paddingHalf = NODE_PADDING / 2;
  let candidateY = preferredY;
  let attempts = 0;

  while (attempts < 100) {
    const topBound = candidateY - halfHeight - paddingHalf;
    const bottomBound = candidateY + halfHeight + paddingHalf;
    const overlap = placedNodes.find(
      (node) => topBound < node.bottomBound && bottomBound > node.topBound,
    );

    if (!overlap) {
      return candidateY;
    }

    candidateY = overlap.bottomBound + halfHeight + paddingHalf;
    attempts += 1;
  }

  return candidateY;
}
