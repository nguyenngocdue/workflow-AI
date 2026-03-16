import {
  NodeKind,
  type ConditionBranch,
  type ConditionRule,
  type HttpNodeData,
  type JsonSchema,
  type ObjectJsonSchema,
  type OutputNodeData,
  type OutputSchemaSourceKey,
  type RichTextDocument,
  type RichTextPart,
  type WorkflowData,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeData,
} from "@/src/core/types";
import { defaultObjectJsonSchema } from "@/src/core/utils";
import { wouldCreateCycle } from "@/src/core/cycle";

const DEFAULT_MODEL = {
  id: "gpt-5-mini",
  name: "gpt-5-mini",
  provider: "openai",
} as const;

const FIELD_TYPES = [
  "string",
  "number",
  "boolean",
  "object",
] as const satisfies JsonSchema["type"][];

export function getNodeKindLabel(kind: NodeKind): string {
  switch (kind) {
    case NodeKind.Input:
      return "Input";
    case NodeKind.Output:
      return "Output";
    case NodeKind.Condition:
      return "Condition";
    case NodeKind.Template:
      return "Template";
    case NodeKind.LLM:
      return "LLM";
    case NodeKind.Tool:
      return "Tool";
    case NodeKind.Http:
      return "HTTP";
    case NodeKind.Note:
      return "Note";
    case NodeKind.Code:
      return "Code";
  }
}

export function getSupportedDesignerKinds(): NodeKind[] {
  return [
    NodeKind.Input,
    NodeKind.Output,
    NodeKind.Condition,
    NodeKind.Template,
    NodeKind.LLM,
    NodeKind.Tool,
    NodeKind.Http,
    NodeKind.Note,
  ];
}

export function createNodeId(kind: NodeKind, existingNodes: WorkflowNode[]) {
  const prefix = kind.toLowerCase();
  let count = existingNodes.filter((node) => node.data.kind === kind).length + 1;
  let candidate = `${prefix}-${count}`;
  while (existingNodes.some((node) => node.id === candidate)) {
    count += 1;
    candidate = `${prefix}-${count}`;
  }
  return candidate;
}

export function createDefaultNode(
  kind: NodeKind,
  existingNodes: WorkflowNode[],
): WorkflowNode {
  const id = createNodeId(kind, existingNodes);
  const name = createUniqueNodeName(kind, existingNodes);
  const position = {
    x: existingNodes.length * 180,
    y: (existingNodes.length % 3) * 180,
  };

  const base = {
    id,
    type: "workflow",
    position,
  };

  switch (kind) {
    case NodeKind.Input:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Entry point for host-provided workflow input.",
          outputSchema: {
            type: "object",
            properties: {
              input: {
                type: "string",
                description: "Primary workflow input",
              },
            },
            required: [],
          },
        },
      };
    case NodeKind.Output:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Final payload that host apps can consume.",
          outputSchema: {
            type: "object",
            properties: {},
          },
          outputData: [],
        },
      };
    case NodeKind.Condition:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Route execution across branches.",
          outputSchema: {
            type: "object",
            properties: {
              type: { type: "string" },
              branch: { type: "string" },
            },
          },
          branches: {
            if: createBranch("if", "if"),
            else: createBranch("else", "else"),
          },
        },
      };
    case NodeKind.Template:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Render host-neutral text with variable references.",
          outputSchema: {
            type: "object",
            properties: {
              template: { type: "string" },
            },
          },
          template: {
            type: "tiptap",
            tiptap: plainTextToRichText("New template"),
          },
        },
      };
    case NodeKind.LLM:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "LLM node for generated text or object output.",
          outputSchema: {
            type: "object",
            properties: {
              answer: { type: "string" },
            },
          },
          model: { ...DEFAULT_MODEL },
          messages: [
            {
              role: "user",
              content: plainTextToRichText("Summarize {{input.input}}"),
            },
          ],
        },
      };
    case NodeKind.Tool:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Tool node routed through package adapters.",
          outputSchema: {
            type: "object",
            properties: {
              tool_result: { type: "string" },
            },
          },
          tool: {
            id: "webSearch",
            description: "Host app tool",
            type: "app-tool",
          },
          model: { ...DEFAULT_MODEL },
          message: plainTextToRichText("Use the tool for {{input.input}}"),
        },
      };
    case NodeKind.Http:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Perform an HTTP request through the host runtime.",
          outputSchema: {
            type: "object",
            properties: {
              response: {
                type: "object",
                properties: {
                  status: { type: "number" },
                  body: { type: "string" },
                },
              },
            },
          },
          url: "https://example.com",
          method: "GET",
          headers: [],
          query: [],
          timeout: 30000,
        },
      };
    case NodeKind.Note:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Freeform note for design-time documentation.",
          outputSchema: {
            type: "object",
            properties: {},
          },
        },
      };
    case NodeKind.Code:
      return {
        ...base,
        data: {
          id,
          name,
          kind,
          description: "Reserved for future parity. Not executable yet.",
          outputSchema: {
            type: "object",
            properties: {},
          },
        } as unknown as WorkflowNodeData,
      };
  }
}

export function createUniqueNodeName(kind: NodeKind, nodes: WorkflowNode[]) {
  const label = getNodeKindLabel(kind);
  let count = nodes.filter((node) => node.data.kind === kind).length + 1;
  let candidate = `${label} ${count}`;
  while (nodes.some((node) => node.data.name === candidate)) {
    count += 1;
    candidate = `${label} ${count}`;
  }
  return candidate;
}

export function createEdgeId(flow: WorkflowData) {
  let count = flow.edges.length + 1;
  let candidate = `edge-${count}`;
  while (flow.edges.some((edge) => edge.id === candidate)) {
    count += 1;
    candidate = `edge-${count}`;
  }
  return candidate;
}

export function addEdgeToFlow(args: {
  flow: WorkflowData;
  source: string;
  target: string;
  sourceHandle?: string;
}) {
  const { flow, source, target, sourceHandle } = args;
  if (!source || !target || source === target) {
    return {
      ok: false as const,
      message: "Source and target must be different nodes.",
    };
  }
  if (
    flow.edges.some(
      (edge) =>
        edge.source === source &&
        edge.target === target &&
        (edge.sourceHandle ?? "") === (sourceHandle ?? ""),
    )
  ) {
    return {
      ok: false as const,
      message: "This connection already exists.",
    };
  }
  if (
    wouldCreateCycle(
      {
        source,
        target,
      },
      flow.edges,
    )
  ) {
    return {
      ok: false as const,
      message: "This connection would create a cycle.",
    };
  }

  const nextEdge: WorkflowEdge = {
    id: createEdgeId(flow),
    source,
    target,
    sourceHandle: sourceHandle || undefined,
  };

  return {
    ok: true as const,
    edge: nextEdge,
  };
}

export function removeNodeFromFlow(flow: WorkflowData, nodeId: string): WorkflowData {
  return {
    nodes: flow.nodes.filter((node) => node.id !== nodeId),
    edges: flow.edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId,
    ),
  };
}

export function updateNodeInFlow(
  flow: WorkflowData,
  nodeId: string,
  updater: (node: WorkflowNode) => WorkflowNode,
): WorkflowData {
  return {
    ...flow,
    nodes: flow.nodes.map((node) => (node.id === nodeId ? updater(node) : node)),
  };
}

export function updateNodeDataInFlow<T extends WorkflowNodeData>(
  flow: WorkflowData,
  nodeId: string,
  updater: (data: T) => T,
): WorkflowData {
  return updateNodeInFlow(flow, nodeId, (node) => ({
    ...node,
    data: updater(node.data as T),
  }));
}

export function plainTextToRichText(text: string): RichTextDocument {
  const content: RichTextPart[] = [];
  const mentionPattern = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  for (const match of text.matchAll(mentionPattern)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const reference = match[1];
    if (index > lastIndex) {
      content.push({
        type: "text",
        text: text.slice(lastIndex, index),
      });
    }
    const [nodeId, ...path] = reference.split(".");
    if (nodeId) {
      content.push({
        type: "mention",
        attrs: {
          label: JSON.stringify({
            nodeId,
            path,
          } satisfies OutputSchemaSourceKey),
        },
      });
    } else {
      content.push({
        type: "text",
        text: raw,
      });
    }
    lastIndex = index + raw.length;
  }
  if (lastIndex < text.length) {
    content.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content,
      },
    ],
  };
}

export function richTextToEditorText(document?: RichTextDocument): string {
  if (!document) {
    return "";
  }
  return (
    document.content
      ?.flatMap((block) => block.content ?? [])
      .map((part) => {
        if (part.type === "text") {
          return part.text;
        }
        if (part.type === "hardBreak") {
          return "\n";
        }
        if (part.type === "mention") {
          try {
            const source = JSON.parse(part.attrs.label) as OutputSchemaSourceKey;
            return `{{${source.nodeId}${source.path.length ? `.${source.path.join(".")}` : ""}}}`;
          } catch {
            return "{{invalid-reference}}";
          }
        }
        return "";
      })
      .join("") ?? ""
  );
}

export function schemaFieldsFromObjectSchema(schema: ObjectJsonSchema) {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([key, field]) => ({
    key,
    type: field.type ?? "string",
    description: field.description ?? "",
    defaultValue:
      field.default === undefined ? "" : String(field.default),
    required: required.has(key),
  }));
}

export function fieldsToObjectSchema(
  fields: Array<{
    key: string;
    type: JsonSchema["type"];
    description?: string;
    defaultValue?: string;
    required?: boolean;
  }>,
): ObjectJsonSchema {
  const properties = fields.reduce<Record<string, JsonSchema>>((acc, field) => {
    if (!field.key.trim()) {
      return acc;
    }
    const next: JsonSchema = {
      type: field.type ?? "string",
    };
    if (field.description?.trim()) {
      next.description = field.description.trim();
    }
    if (field.defaultValue !== undefined && field.defaultValue !== "") {
      next.default = parseDefaultValue(field.defaultValue, field.type);
    }
    acc[field.key.trim()] = next;
    return acc;
  }, {});

  return {
    type: "object",
    properties,
    required: fields
      .filter((field) => field.required && field.key.trim())
      .map((field) => field.key.trim()),
  };
}

export function parseDefaultValue(value: string, type: JsonSchema["type"]) {
  if (type === "number") {
    return Number(value);
  }
  if (type === "boolean") {
    return value === "true";
  }
  if (type === "object") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

export function createSchemaField() {
  return {
    key: "",
    type: "string" as JsonSchema["type"],
    description: "",
    defaultValue: "",
    required: false,
  };
}

export function createOutputMapping(
  sourceNodeId?: string,
): OutputNodeData["outputData"][number] {
  return {
    key: "",
    source: sourceNodeId
      ? {
          nodeId: sourceNodeId,
          path: [],
        }
      : undefined,
  };
}

export function createBranch(
  id: string,
  type: ConditionBranch["type"],
): ConditionBranch {
  return {
    id,
    type,
    logicalOperator: "AND",
    conditions: [],
  };
}

export function createConditionRule(
  sourceNodeId = "",
): ConditionRule {
  return {
    source: {
      nodeId: sourceNodeId,
      path: [],
    },
    operator: "equals",
    value: "",
  };
}

export function getNodeReferenceOptions(flow: WorkflowData, currentNodeId: string) {
  return flow.nodes
    .filter((node) => node.id !== currentNodeId)
    .map((node) => ({
      id: node.id,
      name: node.data.name,
      kind: node.data.kind,
      fields: Object.keys(node.data.outputSchema.properties ?? {}),
    }));
}

export function updateHttpCollectionItem(
  items: Array<{ key: string; value?: HttpNodeData["headers"][number]["value"] }>,
  index: number,
  key: "key" | "value",
  value: string,
) {
  return items.map((item, itemIndex) => {
    if (itemIndex !== index) {
      return item;
    }
    if (key === "key") {
      return {
        ...item,
        key: value,
      };
    }
    return {
      ...item,
      value,
    };
  });
}

export function getFieldTypeOptions() {
  return [...FIELD_TYPES];
}

export function cloneFlow(flow: WorkflowData): WorkflowData {
  return JSON.parse(JSON.stringify(flow)) as WorkflowData;
}

export function ensureObjectSchema(schema?: ObjectJsonSchema): ObjectJsonSchema {
  if (!schema) {
    return { ...defaultObjectJsonSchema };
  }
  return {
    type: "object",
    properties: schema.properties ?? {},
    required: schema.required ?? [],
  };
}
