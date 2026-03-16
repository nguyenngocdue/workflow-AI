export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type JsonSchemaType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

export type JsonSchema = {
  type?: JsonSchemaType;
  title?: string;
  description?: string;
  default?: JsonValue;
  enum?: JsonPrimitive[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
};

export type ObjectJsonSchema = JsonSchema & {
  type: "object";
  properties: Record<string, JsonSchema>;
};

export enum NodeKind {
  Input = "input",
  LLM = "llm",
  Condition = "condition",
  Note = "note",
  Tool = "tool",
  Http = "http",
  Template = "template",
  Code = "code",
  Output = "output",
}

export type OutputSchemaSourceKey = {
  nodeId: string;
  path: string[];
};

export type WorkflowPosition = {
  x: number;
  y: number;
};

export type WorkflowNodeRuntime = {
  isNew?: boolean;
  status?: "fail" | "running" | "success";
};

export type RichTextPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "mention";
      attrs: {
        label: string;
      };
    }
  | {
      type: "hardBreak";
    };

export type RichTextBlock = {
  type: string;
  content?: RichTextPart[];
};

export type RichTextDocument = {
  type: "doc";
  content?: RichTextBlock[];
};

export type WorkflowModelRef = {
  id: string;
  name: string;
  provider?: string;
};

type BaseWorkflowNodeData<TKind extends NodeKind, TExtra = {}> =
  {
    id: string;
    name: string;
    description?: string;
    kind: TKind;
    outputSchema: ObjectJsonSchema;
  } & TExtra;

export type WorkflowToolDefinition =
  | {
      id: string;
      description: string;
      parameterSchema?: JsonSchema;
      returnSchema?: JsonSchema;
      type: "mcp-tool";
      serverId: string;
      serverName: string;
    }
  | {
      id: string;
      description: string;
      parameterSchema?: JsonSchema;
      returnSchema?: JsonSchema;
      type: "app-tool";
    };

export type InputNodeData = BaseWorkflowNodeData<NodeKind.Input>;

export type OutputNodeData = BaseWorkflowNodeData<
  NodeKind.Output,
  {
    outputData: {
      key: string;
      source?: OutputSchemaSourceKey;
    }[];
  }
>;

export type NoteNodeData = BaseWorkflowNodeData<NodeKind.Note>;

export type ToolNodeData = BaseWorkflowNodeData<
  NodeKind.Tool,
  {
    tool?: WorkflowToolDefinition;
    model?: WorkflowModelRef;
    message?: RichTextDocument;
  }
>;

export type LlmMessage = {
  role: "user" | "assistant" | "system";
  content?: RichTextDocument;
};

export type LLMNodeData = BaseWorkflowNodeData<
  NodeKind.LLM,
  {
    model?: WorkflowModelRef;
    messages: LlmMessage[];
  }
>;

export type StringConditionOperatorValue =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty";

export type NumberConditionOperatorValue =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equal"
  | "less_than_or_equal";

export type BooleanConditionOperatorValue = "is_true" | "is_false";

export type ConditionOperator =
  | StringConditionOperatorValue
  | NumberConditionOperatorValue
  | BooleanConditionOperatorValue;

export type ConditionRule = {
  source: OutputSchemaSourceKey;
  operator: ConditionOperator;
  value?: string | number | boolean;
};

export type ConditionBranch = {
  id: "if" | "else" | (string & {});
  type: "if" | "elseIf" | "else";
  conditions: ConditionRule[];
  logicalOperator: "AND" | "OR";
};

export type ConditionBranches = {
  if: ConditionBranch;
  elseIf?: ConditionBranch[];
  else: ConditionBranch;
};

export type ConditionNodeData = BaseWorkflowNodeData<
  NodeKind.Condition,
  {
    branches: ConditionBranches;
  }
>;

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "HEAD";

export type HttpValue = string | OutputSchemaSourceKey;

export type HttpNodeData = BaseWorkflowNodeData<
  NodeKind.Http,
  {
    url?: HttpValue;
    method: HttpMethod;
    headers: {
      key: string;
      value?: HttpValue;
    }[];
    query: {
      key: string;
      value?: HttpValue;
    }[];
    body?: HttpValue;
    timeout?: number;
  }
>;

export type TemplateNodeData = BaseWorkflowNodeData<
  NodeKind.Template,
  {
    template: {
      type: "tiptap";
      tiptap: RichTextDocument;
    };
  }
>;

export type WorkflowNodeData =
  | InputNodeData
  | OutputNodeData
  | NoteNodeData
  | ToolNodeData
  | LLMNodeData
  | ConditionNodeData
  | HttpNodeData
  | TemplateNodeData;

export type WorkflowNode<TData extends WorkflowNodeData = WorkflowNodeData> = {
  id: string;
  type?: string;
  position: WorkflowPosition;
  measured?: {
    height?: number;
    width?: number;
  };
  data: TData & {
    runtime?: WorkflowNodeRuntime;
  };
};

export type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
};

export type WorkflowData = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type WorkflowValidationError = {
  nodeId?: string;
  message: string;
};

export type WorkflowValidationResult = {
  valid: boolean;
  errors: WorkflowValidationError[];
};

export type WorkflowNodeHistory = {
  id: string;
  nodeId: string;
  name: string;
  kind: NodeKind | "skip";
  startedAt: number;
  endedAt?: number;
  error?: string;
  status: "fail" | "running" | "success";
  result?: {
    input?: unknown;
    output?: unknown;
  };
};

export type WorkflowRuntimeEvent =
  | {
      eventType: "WORKFLOW_START";
      startedAt: number;
      input: Record<string, unknown>;
    }
  | {
      eventType: "WORKFLOW_END";
      startedAt: number;
      endedAt: number;
      isOk: boolean;
      error?: string;
    }
  | {
      eventType: "NODE_START";
      startedAt: number;
      node: {
        id: string;
        name: string;
        kind: NodeKind | "skip";
      };
    }
  | {
      eventType: "NODE_END";
      startedAt: number;
      endedAt: number;
      isOk: boolean;
      error?: string;
      node: {
        id: string;
        name: string;
        kind: NodeKind | "skip";
      };
      output?: unknown;
    };

export type WorkflowExecutionResult = {
  isOk: boolean;
  output?: unknown;
  error?: string;
  histories: WorkflowNodeHistory[];
  events: WorkflowRuntimeEvent[];
  state: {
    query: Record<string, unknown>;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
  };
};

export type WorkflowHostConfig = {
  readOnly?: boolean;
  allowedNodeKinds?: NodeKind[];
};
