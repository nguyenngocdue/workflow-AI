import { NodeKind } from "../workflow.interface";
import { createGraphStore } from "./graph-store";
import { addEdgeBranchLabel } from "./add-edge-branch-label";
import { DBEdge, DBNode } from "app-types/workflow";

export const createWorkflowExecutor = (workflow: {
  nodes: DBNode[];
  edges: DBEdge[];
  query: Record<string, unknown>;
}) => {
  return {
    execute: async () => {
      throw new Error("Workflow execution not available in standalone mode");
    },
  };
};
