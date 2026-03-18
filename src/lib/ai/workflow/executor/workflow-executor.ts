import { NodeKind } from "../workflow.interface";
import { createGraphStore, WorkflowRuntimeState } from "./graph-store";
import { createStateGraph, graphNode, StateGraphRegistry } from "ts-edge";
import {
  conditionNodeExecutor,
  outputNodeExecutor,
  customNodeExecutor,
  llmNodeExecutor,
  NodeExecutor,
  inputNodeExecutor,
  toolNodeExecutor,
  httpNodeExecutor,
  templateNodeExecutor,
  pythonScriptExecutor,
} from "./node-executor";
import { toAny } from "lib/utils";
import { addEdgeBranchLabel } from "./add-edge-branch-label";
import { DBEdge, DBNode } from "app-types/workflow";
import { convertDBNodeToUINode } from "../shared.workflow";

export function getExecutorByKind(kind: NodeKind): NodeExecutor {
  switch (kind) {
    case NodeKind.Input:
      return inputNodeExecutor;
    case NodeKind.Output:
      return outputNodeExecutor;
    case NodeKind.LLM:
      return llmNodeExecutor;
    case NodeKind.Condition:
      return conditionNodeExecutor;
    case NodeKind.Tool:
      return toolNodeExecutor;
    case NodeKind.Http:
      return httpNodeExecutor;
    case NodeKind.Template:
      return templateNodeExecutor;
    case NodeKind.PythonScript:
      return pythonScriptExecutor;
    case NodeKind.Custom:
      return customNodeExecutor;
    case "NOOP" as any:
      return () => ({ input: {}, output: {} });
  }
  return () => {
    console.warn(`Undefined '${kind}' Node Executor`);
    return {};
  };
}

export const createWorkflowExecutor = (workflow: {
  nodes: DBNode[];
  edges: DBEdge[];
}) => {
  const store = createGraphStore({
    nodes: workflow.nodes,
    edges: workflow.edges,
  });

  const graph = createStateGraph(store) as StateGraphRegistry<
    WorkflowRuntimeState,
    string
  >;

  // Stamp branch labels on edges (needed for needTable sync)
  addEdgeBranchLabel(workflow.nodes, workflow.edges);

  const skipNode = graphNode({
    name: "SKIP",
    execute() {},
  });

  graph.addNode(skipNode);

  workflow.nodes.forEach((node) => {
    graph.addNode({
      name: node.id,
      metadata: { kind: node.kind },
      async execute(state) {
        const executor = getExecutorByKind(node.kind as NodeKind);
        const result = await executor({
          node: convertDBNodeToUINode(node).data,
          state,
        });
        if (result?.output) {
          state.setOutput({ nodeId: node.id, path: [] }, result.output);
        }
        if (result?.input) {
          state.setInput(node.id, result.input);
        }
      },
    });

    if (node.kind === NodeKind.Condition) {
      graph.dynamicEdge(node.id, (state) => {
        const next = state.getOutput({
          nodeId: node.id,
          path: ["nextNodes"],
        }) as DBNode[];
        if (!next?.length) return;
        return next.map((n) => n.id);
      });
    } else {
      const targetEdges = workflow.edges
        .filter((edge) => edge.source == node.id)
        .map((v) => v.target);
      if (targetEdges.length) toAny(graph.edge)(node.id, targetEdges);
    }
  });

  let needTable: Record<string, number> = buildNeedTable(workflow.edges);

  const app = graph
    .compile(workflow.nodes.find((node) => node.kind == NodeKind.Input)!.id)
    .use(async ({ name: nodeId, input }, next) => {
      if (!(nodeId in needTable)) return;
      const left = --needTable[nodeId];
      if (left > 0) return next({ name: "SKIP", input });
      delete needTable[nodeId];
      return next();
    });

  // Reset needTable on each new run
  app.subscribe((event) => {
    if (event.eventType == "WORKFLOW_START") {
      needTable = buildNeedTable(workflow.edges);
    }
  });

  return app;
};

function buildNeedTable(edges: DBEdge[]): Record<string, number> {
  const map = new Map<string, Set<string>>();
  edges.forEach((e) => {
    const bid = e.uiConfig.label as string;
    (map.get(e.target) ?? map.set(e.target, new Set()).get(e.target))!.add(bid);
  });
  const tbl: Record<string, number> = {};
  map.forEach((set, n) => set.size > 1 && (tbl[n] = set.size));
  return tbl;
}
