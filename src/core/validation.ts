import type {
  ConditionBranch,
  JsonSchema,
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowValidationError,
  WorkflowValidationResult,
} from "@/src/core/types";
import { NodeKind } from "@/src/core/types";
import { findJsonSchemaByPath } from "@/src/core/utils";
import { cleanVariableName } from "@/src/core/utils";

export function validateSchema(key: string, schema: JsonSchema): true {
  const variableName = cleanVariableName(key);
  if (variableName.length === 0) {
    throw new Error("Invalid Variable Name");
  }
  if (variableName.length > 255) {
    throw new Error("Variable Name is too long");
  }
  if (!schema.type) {
    throw new Error("Invalid Schema");
  }
  if (schema.type === "object") {
    const keys = Object.keys(schema.properties ?? {});
    if (keys.length !== new Set(keys).size) {
      throw new Error("Output data must have unique keys");
    }
    keys.forEach((nextKey) => {
      validateSchema(nextKey, schema.properties![nextKey]);
    });
  }
  return true;
}

export function validateWorkflow(workflow: WorkflowData): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];
  const inputNodes = workflow.nodes.filter((node) => node.data.kind === NodeKind.Input);
  const outputNodes = workflow.nodes.filter(
    (node) => node.data.kind === NodeKind.Output,
  );

  if (inputNodes.length !== 1) {
    errors.push({
      message: "Input node must be only one",
    });
  }
  if (outputNodes.length !== 1) {
    errors.push({
      message: "Output node must be only one",
    });
  }

  workflow.nodes.forEach((node) => {
    try {
      validateNode({
        node: node.data,
        nodes: workflow.nodes,
        edges: workflow.edges,
      });
    } catch (error) {
      errors.push({
        nodeId: node.id,
        message:
          error instanceof Error ? error.message : "Unknown validation error",
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateNode({
  node,
  nodes,
  edges,
}: {
  node: WorkflowNodeData;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}) {
  if (
    node.kind !== NodeKind.Note &&
    nodes.filter((item) => item.data.name === node.name).length > 1
  ) {
    throw new Error("Node name must be unique");
  }

  switch (node.kind) {
    case NodeKind.Input:
      return validateInputNode({ node, edges });
    case NodeKind.Output:
      return validateOutputNode({ node, nodes, edges });
    case NodeKind.LLM:
      return validateLlmNode(node);
    case NodeKind.Condition:
      return validateConditionNode(node);
    case NodeKind.Tool:
      return validateToolNode(node);
    case NodeKind.Http:
      return validateHttpNode(node);
    case NodeKind.Template:
      return validateTemplateNode(node);
    case NodeKind.Note:
      return;
  }
}

function validateInputNode({
  node,
  edges,
}: {
  node: Extract<WorkflowNodeData, { kind: NodeKind.Input }>;
  edges: WorkflowEdge[];
}) {
  if (!edges.some((edge) => edge.source === node.id)) {
    throw new Error("Input node must have an edge");
  }

  Object.keys(node.outputSchema.properties ?? {}).forEach((key) => {
    validateSchema(key, node.outputSchema.properties[key]);
  });
}

function validateOutputNode({
  node,
  nodes,
  edges,
}: {
  node: Extract<WorkflowNodeData, { kind: NodeKind.Output }>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}) {
  const names = node.outputData.map((item) => item.key);
  if (names.length !== new Set(names).size) {
    throw new Error("Output data must have unique keys");
  }

  node.outputData.forEach((item) => {
    const variableName = cleanVariableName(item.key);
    if (variableName.length === 0) {
      throw new Error("Invalid Variable Name");
    }
    if (variableName.length > 255) {
      throw new Error("Variable Name is too long");
    }
    if (!item.source) {
      throw new Error("Output data must have a source");
    }
    if (item.source.path.length === 0) {
      throw new Error("Output data must have a path");
    }
    const sourceNode = nodes.find((candidate) => candidate.data.id === item.source?.nodeId);
    if (!sourceNode) {
      throw new Error("Source node not found");
    }
    const sourceSchema = findJsonSchemaByPath(
      sourceNode.data.outputSchema,
      item.source.path,
    );
    if (!sourceSchema) {
      throw new Error("Source schema not found");
    }
  });

  let current: WorkflowNodeData | undefined = node;
  while (current && current.kind !== NodeKind.Input) {
    const previousNodeId = edges.find((edge) => edge.target === current!.id)?.source;
    if (!previousNodeId) {
      throw new Error("Prev node must have an edge");
    }
    const previousNode = nodes.find((candidate) => candidate.data.id === previousNodeId);
    current = previousNode?.data;
  }

  if (current?.kind !== NodeKind.Input) {
    throw new Error("Prev node must be a Input node");
  }
}

function validateLlmNode(node: Extract<WorkflowNodeData, { kind: NodeKind.LLM }>) {
  if (!node.model) {
    throw new Error("LLM node must have a model");
  }
  if (node.messages.length === 0) {
    throw new Error("LLM node must have a message");
  }
  node.messages.forEach((message) => {
    if (!message.role) {
      throw new Error("LLM node must have a role");
    }
    if (!message.content) {
      throw new Error("LLM node must have a content");
    }
  });
}

function validateConditionNode(
  node: Extract<WorkflowNodeData, { kind: NodeKind.Condition }>,
) {
  const branchValidate = (branch: ConditionBranch) => {
    branch.conditions.forEach((condition) => {
      if (!condition.operator) {
        throw new Error("Condition must have a operator");
      }
      if (!condition.source) {
        throw new Error("Condition must have a value");
      }
    });
  };

  [node.branches.if, ...(node.branches.elseIf ?? [])].forEach(branchValidate);
}

function validateToolNode(node: Extract<WorkflowNodeData, { kind: NodeKind.Tool }>) {
  if (!node.tool) {
    throw new Error("Tool node must have a tool");
  }
  if (!node.model) {
    throw new Error("Tool node must have a model");
  }
  if (!node.message) {
    throw new Error("Tool node must have a message");
  }
}

function validateHttpNode(node: Extract<WorkflowNodeData, { kind: NodeKind.Http }>) {
  if (node.url === undefined) {
    throw new Error("HTTP node must have a URL defined");
  }

  const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"];
  if (!validMethods.includes(node.method)) {
    throw new Error(`HTTP method must be one of: ${validMethods.join(", ")}`);
  }

  if (node.timeout !== undefined) {
    if (typeof node.timeout !== "number" || node.timeout <= 0) {
      throw new Error("HTTP timeout must be a positive number");
    }
    if (node.timeout > 300000) {
      throw new Error("HTTP timeout cannot exceed 300000ms (5 minutes)");
    }
  }

  for (const header of node.headers) {
    if (!header.key || header.key.trim().length === 0) {
      throw new Error("Header key cannot be empty");
    }
    const lowerKey = header.key.toLowerCase();
    const duplicates = node.headers.filter(
      (candidate) => candidate.key.toLowerCase() === lowerKey,
    );
    if (duplicates.length > 1) {
      throw new Error(`Duplicate header key: ${header.key}`);
    }
  }

  for (const query of node.query) {
    if (!query.key || query.key.trim().length === 0) {
      throw new Error("Query parameter key cannot be empty");
    }
  }

  if (node.body !== undefined && !["POST", "PUT", "PATCH"].includes(node.method)) {
    throw new Error(`Body is not allowed for ${node.method} requests`);
  }
}

function validateTemplateNode(
  node: Extract<WorkflowNodeData, { kind: NodeKind.Template }>,
) {
  if (node.template.type !== "tiptap") {
    throw new Error("Template node only supports tiptap documents");
  }
}
