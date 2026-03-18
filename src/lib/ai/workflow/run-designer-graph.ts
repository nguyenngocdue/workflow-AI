/**
 * Run a custom node type's sub-graph (designer graph) with a given query.
 * Supports type-input (query), type-output (collectors), and system nodes (LLM, Code, Python Script, etc.).
 */
import type {
  CustomNodeTypeDefinition,
  DesignerEdge,
  DesignerGraphNode,
  DesignerSystemNode,
} from "app-types/custom-node-type";
import { isDesignerNode } from "app-types/custom-node-type";
import { getExecutorByKind } from "./executor/workflow-executor";
import { convertDBNodeToUINode } from "./shared.workflow";
import type { DBNode, DBEdge } from "app-types/workflow";
import type { WorkflowRuntimeState } from "./executor/graph-store";
import { NodeKind } from "./workflow.interface";

function setByPath(obj: Record<string, unknown>, path: string[], value: unknown) {
  if (path.length === 0) return;
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (!(p in cur) || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[path[path.length - 1]] = value;
}

function getByPath(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj;
  for (const p of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function toDBNode(sn: DesignerSystemNode, typeId: string): DBNode {
  return {
    ...sn,
    workflowId: typeId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as DBNode;
}

function toDBEdge(e: DesignerEdge, typeId: string): DBEdge {
  return {
    id: e.id,
    workflowId: typeId,
    source: e.source,
    target: e.target,
    uiConfig: { sourceHandle: e.sourceHandle, targetHandle: e.targetHandle },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as DBEdge;
}

/** Topological order of system node ids (dependencies first). */
function topoOrder(
  systemNodeIds: Set<string>,
  typeInputIds: Set<string>,
  edges: DesignerEdge[],
): string[] {
  const order: string[] = [];
  const done = new Set<string>(typeInputIds);
  const remaining = new Set(systemNodeIds);
  while (remaining.size > 0) {
    let progress = false;
    for (const id of remaining) {
      const deps = edges
        .filter((e) => e.target === id && (typeInputIds.has(e.source) || systemNodeIds.has(e.source)))
        .map((e) => e.source);
      if (deps.every((d) => done.has(d))) {
        order.push(id);
        done.add(id);
        remaining.delete(id);
        progress = true;
      }
    }
    if (!progress) break;
  }
  return order;
}

export async function runDesignerSubgraph(
  type: CustomNodeTypeDefinition,
  query: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const allNodes = type.nodes ?? [];
  const edges = type.edges ?? [];
  const legacyInputNodes = allNodes.filter((n): n is import("app-types/custom-node-type").DesignerNode => isDesignerNode(n) && n.kind === "type-input");
  const workflowInputNodes = allNodes.filter((n): n is DesignerSystemNode => !isDesignerNode(n) && n.kind === NodeKind.Input);
  const typeInputNodes = [...legacyInputNodes, ...workflowInputNodes];
  const legacyOutputNodes = allNodes.filter((n): n is import("app-types/custom-node-type").DesignerNode => isDesignerNode(n) && n.kind === "type-output");
  const workflowOutputNodes = allNodes.filter((n): n is DesignerSystemNode => !isDesignerNode(n) && n.kind === NodeKind.Output);
  const typeOutputNodes = [...legacyOutputNodes, ...workflowOutputNodes];
  const systemNodes = allNodes.filter((n): n is DesignerSystemNode => !isDesignerNode(n));
  const typeInputIds = new Set(typeInputNodes.map((n) => n.id));
  const systemNodeIds = new Set(systemNodes.map((n) => n.id));

  const result: Record<string, unknown> = {};

  if (systemNodes.length === 0) {
    for (const outNode of typeOutputNodes) {
      const edge = edges.find((e) => e.target === outNode.id);
      if (!edge) continue;
      const sourceVal = query[edge.source];
      if (sourceVal !== undefined) {
        result[outNode.id] = sourceVal;
        if (outNode.name) result[outNode.name] = sourceVal;
      }
    }
    return result;
  }

  const typeId = type.id;
  const dbNodes = systemNodes.map((n) => toDBNode(n, typeId));
  const dbEdges = edges.map((e) => toDBEdge(e, typeId));

  const outputs: Record<string, unknown> = { ...query };
  const state: WorkflowRuntimeState = {
    query: { ...query },
    inputs: {},
    nodes: dbNodes,
    edges: dbEdges,
    outputs,
    setInput() {},
    getInput: () => undefined,
    setOutput(key, value) {
      setByPath(outputs, [key.nodeId, ...key.path], value);
    },
    getOutput<T>(key: import("./workflow.interface").OutputSchemaSourceKey): T | undefined {
      return getByPath(outputs, [key.nodeId, ...key.path]) as T | undefined;
    },
  };

  const systemNodeIdsToRun = new Set(systemNodeIds);
  typeInputIds.forEach((id) => systemNodeIdsToRun.delete(id));
  const order = topoOrder(systemNodeIdsToRun, typeInputIds, edges);
  for (const nodeId of order) {
    const node = dbNodes.find((n) => n.id === nodeId);
    if (!node) continue;
    const executor = getExecutorByKind(node.kind as NodeKind);
    const nodeData = convertDBNodeToUINode(node).data;
    try {
      const out = await executor({ node: nodeData, state });
      if (out?.output) state.setOutput({ nodeId, path: [] }, out.output);
    } catch (err) {
      throw err;
    }
  }

  for (const outNode of typeOutputNodes) {
    if (isDesignerNode(outNode)) {
      const edge = edges.find((e) => e.target === outNode.id);
      if (!edge) continue;
      const sourceVal = state.getOutput({ nodeId: edge.source, path: [] });
      if (sourceVal !== undefined) {
        result[outNode.id] = sourceVal;
        if (outNode.name) result[outNode.name] = sourceVal;
      }
    } else {
      const edge = edges.find((e) => e.target === outNode.id);
      const outVal = state.getOutput({ nodeId: outNode.id, path: [] }) as Record<string, unknown> | undefined;
      if (outVal && typeof outVal === "object") {
        for (const [k, v] of Object.entries(outVal)) {
          if (v !== undefined) result[k] = v;
        }
      }
      if (edge) {
        const sourceOutput = state.getOutput({ nodeId: edge.source, path: [] }) as Record<string, unknown> | undefined;
        if (sourceOutput && typeof sourceOutput === "object" && "OUT" in sourceOutput) {
          result.OUT = sourceOutput.OUT;
        }
      }
    }
  }
  return result;
}
