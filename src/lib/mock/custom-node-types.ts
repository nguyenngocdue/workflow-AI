/**
 * In-memory store for user-defined node types (Node Designer).
 * Supports both legacy (outputSchema only) and Dynamo-style (nodes + edges sub-graph).
 */
import { generateUUID } from "lib/utils";
import type {
  CustomNodeTypeDefinition,
  CustomNodeTypeField,
  DesignerNode,
  DesignerEdge,
  DesignerGraphNode,
} from "app-types/custom-node-type";
import { getTypeOutputSchema } from "app-types/custom-node-type";

const store: CustomNodeTypeDefinition[] = [];

export function getCustomNodeTypes(): CustomNodeTypeDefinition[] {
  return [...store];
}

export function getCustomNodeTypeById(id: string): CustomNodeTypeDefinition | undefined {
  return store.find((t) => t.id === id);
}

export function createCustomNodeType(data: {
  name: string;
  description?: string;
  outputSchema?: CustomNodeTypeField[];
  nodes?: DesignerGraphNode[];
  edges?: DesignerEdge[];
}): CustomNodeTypeDefinition {
  const now = new Date().toISOString();
  const nodes = data.nodes?.map((n) => ({ ...n })) ?? [];
  const edges = data.edges?.map((e) => ({ ...e })) ?? [];
  const item: CustomNodeTypeDefinition = {
    id: generateUUID(),
    name: data.name,
    description: data.description,
    outputSchema:
      data.outputSchema ??
      (nodes.length ? getTypeOutputSchema({ id: "", name: "", outputSchema: [], nodes, edges, createdAt: now, updatedAt: now }) : []),
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
  store.push(item);
  return item;
}

export function updateCustomNodeType(
  id: string,
  data: Partial<Pick<CustomNodeTypeDefinition, "name" | "description" | "outputSchema" | "nodes" | "edges">>,
): CustomNodeTypeDefinition | null {
  const idx = store.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const next = { ...store[idx], ...data, updatedAt: now };
  if (data.nodes && data.edges && (data.nodes.length || data.edges.length)) {
    next.outputSchema = getTypeOutputSchema(next);
  }
  store[idx] = next;
  return store[idx];
}

export function deleteCustomNodeType(id: string): boolean {
  const idx = store.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}
