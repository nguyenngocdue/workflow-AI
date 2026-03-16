"use client";

import { MarkerType, type Connection, type Edge, type Node } from "@xyflow/react";
import {
  NodeKind,
  type ConditionBranch,
  type ConditionNodeData,
  type WorkflowData,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeData,
  type WorkflowNodeRuntime,
} from "@/src/core/types";
import { convertRichTextToText, deepEqual } from "@/src/core/utils";
import { wouldCreateCycle } from "@/src/core/cycle";
import {
  getNodeKindLabel,
  richTextToEditorText,
} from "@/src/features/editor/workflow-editor-utils";

export type RuntimeStatus = WorkflowNodeRuntime["status"];

export type CanvasNodeData = {
  workflowNode: WorkflowNode;
  runtimeStatus?: RuntimeStatus;
};

export type CanvasNode = Node<CanvasNodeData, "workflow">;
export type CanvasEdge = Edge;

export function toCanvasNodes(args: {
  workflow: WorkflowData;
  runtimeByNodeId?: Record<string, RuntimeStatus | undefined>;
  selectedNodeId?: string;
}): CanvasNode[] {
  const { workflow, runtimeByNodeId = {}, selectedNodeId } = args;
  return workflow.nodes.map((node) => ({
    id: node.id,
    type: "workflow",
    position: node.position,
    selected: node.id === selectedNodeId,
    data: {
      workflowNode: node,
      runtimeStatus: runtimeByNodeId[node.id],
    },
  }));
}

export function toCanvasEdges(args: {
  workflow: WorkflowData;
  runtimeByNodeId?: Record<string, RuntimeStatus | undefined>;
  activeNodeIds?: string[];
}): CanvasEdge[] {
  const { workflow, runtimeByNodeId = {}, activeNodeIds = [] } = args;
  const activeSet = new Set(activeNodeIds);

  return workflow.edges.map((edge) => {
    const sourceStatus = runtimeByNodeId[edge.source];
    const targetStatus = runtimeByNodeId[edge.target];
    const isActive = activeSet.has(edge.source) || activeSet.has(edge.target);
    const stroke =
      targetStatus === "fail"
        ? "var(--error)"
        : sourceStatus === "running" || targetStatus === "running"
          ? "var(--ok)"
          : sourceStatus === "success" && targetStatus === "success"
            ? "var(--ok)"
            : isActive
              ? "var(--accent)"
              : "rgba(20, 33, 61, 0.28)";

    const label = edge.label ?? getBranchLabel(edge.sourceHandle);

    return {
      ...edge,
      type: "smoothstep",
      label,
      style: {
        stroke,
        strokeWidth: isActive ? 2.6 : 2,
      },
      animated: sourceStatus === "running",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
      },
      labelStyle: {
        fill: "var(--text)",
        fontWeight: 700,
        fontSize: 11,
      },
      labelBgStyle: {
        fill: "rgba(255, 250, 240, 0.96)",
        stroke: "rgba(15, 23, 42, 0.1)",
        strokeWidth: 1,
      },
      labelBgBorderRadius: 12,
      labelShowBg: Boolean(label),
    };
  });
}

export function extractWorkflowFromCanvas(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): WorkflowData {
  return {
    nodes: nodes.map((node) => ({
      ...node.data.workflowNode,
      position: {
        x: node.position.x,
        y: node.position.y,
      },
      measured: node.measured
        ? {
            height: node.measured.height,
            width: node.measured.width,
          }
        : node.data.workflowNode.measured,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
      label: typeof edge.label === "string" ? edge.label : undefined,
    })),
  };
}

export function areCanvasAndWorkflowEqual(
  workflow: WorkflowData,
  canvasNodes: CanvasNode[],
  canvasEdges: CanvasEdge[],
): boolean {
  return deepEqual(workflow, extractWorkflowFromCanvas(canvasNodes, canvasEdges));
}

export function getConditionHandles(node: ConditionNodeData) {
  return [
    {
      id: node.branches.if.id,
      label: "IF",
      type: node.branches.if.type,
    },
    ...(node.branches.elseIf ?? []).map((branch, index) => ({
      id: branch.id,
      label: `ELSE IF ${index + 1}`,
      type: branch.type,
    })),
    {
      id: node.branches.else.id,
      label: "ELSE",
      type: node.branches.else.type,
    },
  ] satisfies Array<{
    id: string;
    label: string;
    type: ConditionBranch["type"];
  }>;
}

export function getNodePreviewLines(node: WorkflowNodeData): string[] {
  switch (node.kind) {
    case NodeKind.Input: {
      const fields = Object.entries(node.outputSchema.properties ?? {});
      if (fields.length === 0) {
        return ["No input fields"];
      }
      return fields.slice(0, 3).map(([key, schema]) => `${key}: ${schema.type ?? "any"}`);
    }
    case NodeKind.Output: {
      if (node.outputData.length === 0) {
        return ["No output mappings"];
      }
      return node.outputData.slice(0, 3).map((item) => {
        if (!item.source) {
          return `${item.key} <- unbound`;
        }
        const path = item.source.path.join(".");
        return `${item.key} <- ${item.source.nodeId}${path ? `.${path}` : ""}`;
      });
    }
    case NodeKind.Condition:
      return getConditionHandles(node).map((branch) => branch.label);
    case NodeKind.Template: {
      const text = richTextToEditorText(node.template.tiptap);
      return text ? [truncate(text, 80)] : ["Empty template"];
    }
    case NodeKind.LLM: {
      const text = node.messages[0]?.content
        ? convertRichTextToText({
            document: node.messages[0].content,
            getOutput: () => "",
          })
        : "";
      return [node.model?.name ?? "No model", truncate(text || "No prompt", 80)];
    }
    case NodeKind.Tool: {
      const prompt = node.message
        ? convertRichTextToText({
            document: node.message,
            getOutput: () => "",
          })
        : "";
      return [node.tool?.id ?? "No tool selected", truncate(prompt || "No tool prompt", 80)];
    }
    case NodeKind.Http: {
      const url =
        typeof node.url === "string"
          ? node.url
          : node.url
            ? `${node.url.nodeId}.${node.url.path.join(".")}`
            : "No URL";
      return [`${node.method} ${truncate(url, 56)}`];
    }
    case NodeKind.Note:
      return [truncate(node.description || "Design-time note", 84)];
  }
}

export function isConnectionAllowed(args: {
  workflow: WorkflowData;
  connection: Pick<Connection | Edge, "source" | "target" | "sourceHandle">;
}): boolean {
  const { workflow, connection } = args;
  const { source, target, sourceHandle } = connection;
  if (!source || !target || source === target) {
    return false;
  }

  const sourceNode = workflow.nodes.find((node) => node.id === source);
  const targetNode = workflow.nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) {
    return false;
  }

  if (targetNode.data.kind === NodeKind.Input || targetNode.data.kind === NodeKind.Note) {
    return false;
  }
  if (sourceNode.data.kind === NodeKind.Note || sourceNode.data.kind === NodeKind.Output) {
    return false;
  }

  if (sourceNode.data.kind === NodeKind.Condition) {
    if (!sourceHandle) {
      return false;
    }
    if (
      workflow.edges.some(
        (edge) => edge.source === source && (edge.sourceHandle ?? "") === sourceHandle,
      )
    ) {
      return false;
    }
  } else if (workflow.edges.some((edge) => edge.source === source)) {
    return false;
  }

  if (
    workflow.edges.some(
      (edge) =>
        edge.source === source &&
        edge.target === target &&
        (edge.sourceHandle ?? "") === (sourceHandle ?? ""),
    )
  ) {
    return false;
  }

  return !wouldCreateCycle(
    {
      source,
      target,
    },
    workflow.edges,
  );
}

export function getAppendSource(workflow: WorkflowData, selectedNodeId?: string) {
  if (!selectedNodeId) {
    return undefined;
  }

  const node = workflow.nodes.find((candidate) => candidate.id === selectedNodeId);
  if (!node) {
    return undefined;
  }

  if (node.data.kind === NodeKind.Note || node.data.kind === NodeKind.Output) {
    return undefined;
  }

  if (node.data.kind === NodeKind.Condition) {
    const usedHandles = new Set(
      workflow.edges
        .filter((edge) => edge.source === node.id)
        .map((edge) => edge.sourceHandle)
        .filter((value): value is string => Boolean(value)),
    );
    const openHandle = getConditionHandles(node.data).find(
      (handle) => !usedHandles.has(handle.id),
    );
    if (!openHandle) {
      return undefined;
    }
    return {
      source: node.id,
      sourceHandle: openHandle.id,
    };
  }

  if (workflow.edges.some((edge) => edge.source === node.id)) {
    return undefined;
  }

  return {
    source: node.id,
  };
}

export function getNodeGlyph(kind: NodeKind): string {
  switch (kind) {
    case NodeKind.Input:
      return "IN";
    case NodeKind.Output:
      return "OUT";
    case NodeKind.Condition:
      return "?";
    case NodeKind.Template:
      return "T";
    case NodeKind.LLM:
      return "AI";
    case NodeKind.Tool:
      return "TL";
    case NodeKind.Http:
      return "HTTP";
    case NodeKind.Note:
      return "N";
    case NodeKind.Code:
      return "</>";
  }
}

export function getNodeAccent(kind: NodeKind): string {
  switch (kind) {
    case NodeKind.Input:
      return "var(--accent)";
    case NodeKind.Output:
      return "#125e8a";
    case NodeKind.Condition:
      return "#7a4c14";
    case NodeKind.Template:
      return "#8a3b12";
    case NodeKind.LLM:
      return "#0d6a4d";
    case NodeKind.Tool:
      return "#5a3f96";
    case NodeKind.Http:
      return "#8e1f4d";
    case NodeKind.Note:
      return "rgba(20, 33, 61, 0.42)";
    case NodeKind.Code:
      return "#374151";
  }
}

export function getNodeKindTitle(kind: NodeKind) {
  return getNodeKindLabel(kind).toUpperCase();
}

export function getBranchLabel(sourceHandle?: string | null) {
  if (!sourceHandle) {
    return undefined;
  }
  if (sourceHandle === "if") {
    return "IF";
  }
  if (sourceHandle === "else") {
    return "ELSE";
  }
  return sourceHandle.toUpperCase().replaceAll("_", " ");
}

function truncate(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}
