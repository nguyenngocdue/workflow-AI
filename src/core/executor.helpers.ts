import type {
  HttpValue,
  OutputSchemaSourceKey,
  WorkflowEdge,
  WorkflowNode,
} from "@/src/core/types";

export function addBranchLabels(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const outs = (id: string) => edges.filter((edge) => edge.source === id);
  const start = nodes.find((node) => node.data.kind === "input");
  if (!start) {
    return;
  }

  const queue: { id: string; branchId: string }[] = [{ id: start.id, branchId: "B0" }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodes.find((candidate) => candidate.id === current.id);
    if (!node) {
      continue;
    }
    const nextEdges = outs(current.id);

    if (node.data.kind === "condition") {
      const byHandle = new Map<string, WorkflowEdge[]>();
      nextEdges.forEach((edge) => {
        const handle = edge.sourceHandle ?? "right";
        if (!byHandle.has(handle)) {
          byHandle.set(handle, []);
        }
        byHandle.get(handle)!.push(edge);
      });

      byHandle.forEach((group) => {
        if (group.length === 1) {
          const edge = group[0];
          if (!edge.label) {
            edge.label = current.branchId;
            queue.push({ id: edge.target, branchId: current.branchId });
          }
        } else {
          group.forEach((edge, index) => {
            const nextBranchId = `${current.branchId}.${index}`;
            if (!edge.label) {
              edge.label = nextBranchId;
              queue.push({ id: edge.target, branchId: nextBranchId });
            }
          });
        }
      });
      continue;
    }

    nextEdges.forEach((edge, index) => {
      const nextBranchId =
        nextEdges.length > 1 ? `${current.branchId}.${index}` : current.branchId;
      if (!edge.label) {
        edge.label = nextBranchId;
        queue.push({ id: edge.target, branchId: nextBranchId });
      }
    });
  }
}

export function buildNeedTable(edges: WorkflowEdge[]): Record<string, number> {
  const map = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    const branchId = edge.label;
    if (!branchId) {
      return;
    }
    if (!map.has(edge.target)) {
      map.set(edge.target, new Set());
    }
    map.get(edge.target)!.add(branchId);
  });

  const table: Record<string, number> = {};
  map.forEach((branchIds, nodeId) => {
    if (branchIds.size > 1) {
      table[nodeId] = branchIds.size;
    }
  });
  return table;
}

export function buildOutgoingMap(edges: WorkflowEdge[]): Map<string, WorkflowEdge[]> {
  const map = new Map<string, WorkflowEdge[]>();
  edges.forEach((edge) => {
    if (!map.has(edge.source)) {
      map.set(edge.source, []);
    }
    map.get(edge.source)!.push(edge);
  });
  return map;
}

export function resolveHttpValue(
  value: HttpValue | undefined,
  getOutput: <T>(key: OutputSchemaSourceKey) => T | undefined,
): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }

  const output = getOutput(value);
  if (output === undefined || output === null) {
    return "";
  }
  if (typeof output === "string" || typeof output === "number") {
    return output.toString();
  }
  return JSON.stringify(output);
}
