/**
 * User-defined node type (Dynamo-style).
 * Can be defined by:
 * - Legacy: outputSchema only (single output mapping on main canvas).
 * - Graph: sub-graph with type-input / type-output nodes (design on ReactFlow, run test).
 */
export type CustomNodeTypeField = {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
};

/** Node kinds only used inside Node Designer (sub-graph). */
export type DesignerNodeKind = "type-input" | "type-output";

/** One node in the type's sub-graph (Dynamo-style IN/OUT). */
export type DesignerNode = {
  id: string;
  kind: DesignerNodeKind;
  name: string;
  /** Port type for type-input and type-output */
  portType: CustomNodeTypeField["type"];
  position: { x: number; y: number };
};

/** Edge in the type's sub-graph (e.g. type-input → type-output or system node connections). */
export type DesignerEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};

/** System node stored in designer graph (same shape as DBNode without workflowId/timestamps). */
export type DesignerSystemNode = {
  id: string;
  kind: string;
  name: string;
  description?: string;
  nodeConfig: Record<string, unknown>;
  uiConfig: { position?: { x: number; y: number }; type?: string; [key: string]: unknown };
};

/** One node in the designer graph: either a port (type-input/type-output) or a system node. */
export type DesignerGraphNode = DesignerNode | DesignerSystemNode;

export function isDesignerNode(n: DesignerGraphNode): n is DesignerNode {
  return n.kind === "type-input" || n.kind === "type-output";
}

export type CustomNodeTypeDefinition = {
  id: string;
  name: string;
  description?: string;
  /** Legacy: flat output schema (when no graph). */
  outputSchema: CustomNodeTypeField[];
  /** Dynamo-style: sub-graph. Ports + optional system nodes. Input/output from type-input / type-output. */
  nodes?: DesignerGraphNode[];
  edges?: DesignerEdge[];
  createdAt: string;
  updatedAt: string;
};

function schemaPropToType(prop: { type?: string } | undefined): CustomNodeTypeField["type"] {
  const t = prop?.type;
  if (t === "string" || t === "number" || t === "boolean" || t === "object" || t === "array") return t;
  return "string";
}

/** Derive input schema from type-input nodes or Workflow Input nodes. */
export function getTypeInputSchema(t: CustomNodeTypeDefinition): CustomNodeTypeField[] {
  if (!t.nodes?.length) return [];
  const fromLegacy = t.nodes
    .filter((n): n is DesignerNode => isDesignerNode(n) && n.kind === "type-input")
    .map((n) => ({ key: n.name || n.id, type: n.portType, description: undefined }));
  if (fromLegacy.length) return fromLegacy;
  const fromInput = t.nodes
    .filter((n): n is DesignerSystemNode => !isDesignerNode(n) && n.kind === "input")
    .flatMap((n) => {
      const props = (n.nodeConfig?.outputSchema as { properties?: Record<string, { type?: string }> })?.properties;
      if (!props) return [{ key: n.name || n.id, type: "string" as const, description: undefined }];
      return Object.entries(props).map(([key, p]) => ({
        key,
        type: schemaPropToType(p),
        description: undefined,
      }));
    });
  return fromInput.length ? fromInput : [];
}

/** Derive output schema from type-output nodes or Workflow Output nodes. */
export function getTypeOutputSchema(t: CustomNodeTypeDefinition): CustomNodeTypeField[] {
  if (!t.nodes?.length) return t.outputSchema ?? [];
  const fromLegacy = t.nodes
    .filter((n): n is DesignerNode => isDesignerNode(n) && n.kind === "type-output")
    .map((n) => ({ key: n.name || n.id, type: n.portType, description: undefined }));
  if (fromLegacy.length) return fromLegacy;
  const fromOutput = t.nodes
    .filter((n): n is DesignerSystemNode => !isDesignerNode(n) && n.kind === "output")
    .flatMap((n) => {
      const outputData = (n.nodeConfig?.outputData as { key: string }[]) ?? [];
      return outputData.map((o) => ({ key: o.key, type: "string" as CustomNodeTypeField["type"], description: undefined }));
    });
  return fromOutput.length ? fromOutput : (t.outputSchema ?? []);
}
