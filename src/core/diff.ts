import type { WorkflowData, WorkflowEdge, WorkflowNode } from "@/src/core/types";
import { deepEqual } from "@/src/core/utils";

function normalizeNode(node: WorkflowNode) {
  return {
    id: node.id,
    data: {
      ...node.data,
      id: undefined,
      runtime: undefined,
      description: undefined,
      name: undefined,
    },
    name: node.data.name || "",
    description: node.data.description || "",
    position: {
      ...node.position,
    },
  };
}

function normalizeEdge(edge: WorkflowEdge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    targetHandle: edge.targetHandle ?? "",
    sourceHandle: edge.sourceHandle ?? "",
  };
}

export function extractWorkflowDiff(
  oldData: WorkflowData,
  newData: WorkflowData,
) {
  const deleteNodes: WorkflowNode[] = [];
  const deleteEdges: WorkflowEdge[] = [];
  const updateNodes: WorkflowNode[] = [];
  const updateEdges: WorkflowEdge[] = [];

  const oldNodes = oldData.nodes;
  const newNodes = new Map(newData.nodes.map((node) => [node.id, node]));

  oldNodes.forEach((node) => {
    const nextNode = newNodes.get(node.id);
    if (!nextNode) {
      deleteNodes.push(node);
    } else if (!deepEqual(normalizeNode(node), normalizeNode(nextNode))) {
      updateNodes.push(nextNode);
    }
    newNodes.delete(node.id);
  });

  updateNodes.push(...newNodes.values());

  const oldEdges = oldData.edges;
  const newEdges = new Map(newData.edges.map((edge) => [edge.id, edge]));

  oldEdges.forEach((edge) => {
    const nextEdge = newEdges.get(edge.id);
    if (!nextEdge) {
      deleteEdges.push(edge);
    } else if (!deepEqual(normalizeEdge(edge), normalizeEdge(nextEdge))) {
      updateEdges.push(nextEdge);
    }
    newEdges.delete(edge.id);
  });

  updateEdges.push(...newEdges.values());

  return {
    deleteNodes,
    deleteEdges,
    updateNodes,
    updateEdges,
  };
}
