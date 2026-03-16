import type { WorkflowEdge } from "@/src/core/types";

export function wouldCreateCycle(
  connection: Pick<WorkflowEdge, "source" | "target">,
  existingEdges: Pick<WorkflowEdge, "source" | "target">[],
): boolean {
  if (!connection.source || !connection.target) {
    return false;
  }

  const adjacencyList = new Map<string, string[]>();

  for (const edge of existingEdges) {
    if (!adjacencyList.has(edge.source)) {
      adjacencyList.set(edge.source, []);
    }
    adjacencyList.get(edge.source)!.push(edge.target);
  }

  if (!adjacencyList.has(connection.source)) {
    adjacencyList.set(connection.source, []);
  }
  adjacencyList.get(connection.source)!.push(connection.target);

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    if (recursionStack.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    recursionStack.add(node);

    const neighbors = adjacencyList.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  const allNodes = new Set<string>();
  existingEdges.forEach((edge) => {
    allNodes.add(edge.source);
    allNodes.add(edge.target);
  });
  allNodes.add(connection.source);
  allNodes.add(connection.target);

  for (const node of allNodes) {
    if (!visited.has(node) && dfs(node)) {
      return true;
    }
  }

  return false;
}
