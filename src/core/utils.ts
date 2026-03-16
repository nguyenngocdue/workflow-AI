import type {
  JsonSchema,
  ObjectJsonSchema,
  OutputSchemaSourceKey,
  RichTextDocument,
  RichTextPart,
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
} from "@/src/core/types";
import { NodeKind } from "@/src/core/types";

export const defaultObjectJsonSchema: ObjectJsonSchema = {
  type: "object",
  properties: {},
};

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function cleanVariableName(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getValueByPath(
  value: unknown,
  path: readonly string[],
): unknown {
  return path.reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

export function setValueByPath(
  target: Record<string, unknown>,
  path: readonly string[],
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {
      value,
    };
  }

  const clone = cloneValue(target);
  let cursor: Record<string, unknown> = clone;

  path.forEach((segment, index) => {
    const isLast = index === path.length - 1;
    if (isLast) {
      cursor[segment] = value;
      return;
    }

    const existing = cursor[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  });

  return clone;
}

export function findAccessibleNodeIds({
  nodeId,
  nodes,
  edges,
}: {
  nodeId: string;
  nodes: WorkflowNodeData[];
  edges: Pick<WorkflowEdge, "source" | "target">[];
}): string[] {
  const accessibleNodes: string[] = [];
  const allNodeIds = nodes.map((node) => node.id);
  let currentNodes = [nodeId];

  while (currentNodes.length > 0) {
    const targets = [...currentNodes];
    currentNodes = [];
    for (const target of targets) {
      const sources = edges
        .filter(
          (edge) => edge.target === target && allNodeIds.includes(edge.source),
        )
        .map((edge) => edge.source);

      accessibleNodes.push(...sources);
      currentNodes.push(...sources);
    }
  }

  return [...new Set(accessibleNodes)];
}

export function findJsonSchemaByPath(
  schema: ObjectJsonSchema,
  path: string[],
): JsonSchema | undefined {
  if (path.length === 0) {
    return schema;
  }

  const [key, ...rest] = path;
  const next = schema.properties?.[key];

  if (!next) {
    return undefined;
  }
  if (rest.length === 0) {
    return next;
  }
  if (next.type !== "object" || !next.properties) {
    return undefined;
  }
  return findJsonSchemaByPath(next as ObjectJsonSchema, rest);
}

export function findAvailableSchemaBySource({
  nodeId,
  source,
  nodes,
  edges,
}: {
  nodeId: string;
  source: OutputSchemaSourceKey;
  nodes: WorkflowNodeData[];
  edges: Pick<WorkflowEdge, "source" | "target">[];
}): {
  nodeName: string;
  path: string[];
  notFound?: boolean;
  type?: string;
} {
  const accessibleNodes = findAccessibleNodeIds({
    nodeId,
    nodes,
    edges,
  });

  const response = {
    nodeName: "ERROR",
    path: source.path,
    notFound: true,
    type: undefined as string | undefined,
  };

  if (!accessibleNodes.includes(source.nodeId)) {
    return response;
  }

  const sourceNode = nodes.find((node) => node.id === source.nodeId);
  if (!sourceNode) {
    return response;
  }

  response.nodeName = sourceNode.name;
  const schema = findJsonSchemaByPath(sourceNode.outputSchema, source.path);
  if (!schema) {
    return response;
  }

  response.notFound = false;
  response.type = schema.type;
  return response;
}

export function convertRichTextToText({
  document,
  getOutput,
  mentionParser,
}: {
  document: RichTextDocument;
  getOutput: (key: OutputSchemaSourceKey) => unknown;
  mentionParser?: (part: Extract<RichTextPart, { type: "mention" }>) => string;
}): string {
  const parser =
    mentionParser ??
    ((part: Extract<RichTextPart, { type: "mention" }>) => {
      const key = JSON.parse(part.attrs.label) as OutputSchemaSourceKey;
      const value = getOutput(key);
      if (value === undefined || value === null) {
        return "";
      }
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    });

  const tokens =
    document.content?.flatMap((block) => block.content ?? []).map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      if (part.type === "mention") {
        return parser(part);
      }
      if (part.type === "hardBreak") {
        return "__WORKFLOW_HARD_BREAK__";
      }
      return "";
    }) ?? [];

  return tokens
    .join(" ")
    .replace(/\s*__WORKFLOW_HARD_BREAK__\s*/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ \./g, ".")
    .replace(/ ,/g, ",")
    .replace(/ \!/g, "!")
    .replace(/ \?/g, "?")
    .replace(/ \:/g, ":")
    .replace(/ \;/g, ";")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildNodeMap(workflow: WorkflowData): Map<string, WorkflowNode> {
  return new Map(workflow.nodes.map((node) => [node.id, node]));
}

export function getInputNode(workflow: WorkflowData): WorkflowNode | undefined {
  return workflow.nodes.find((node) => node.data.kind === NodeKind.Input);
}

export function getOutputNode(workflow: WorkflowData): WorkflowNode | undefined {
  return workflow.nodes.find((node) => node.data.kind === NodeKind.Output);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
