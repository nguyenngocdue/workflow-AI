import type {
  OutputSchemaSourceKey,
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
} from "@/src/core/types";
import {
  defaultObjectJsonSchema,
  findJsonSchemaByPath,
  getValueByPath,
  setValueByPath,
} from "@/src/core/utils";

export interface WorkflowRuntimeState {
  query: Record<string, unknown>;
  inputs: Record<string, unknown>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  outputs: Record<string, unknown>;
  setInput(nodeId: string, value: unknown): void;
  getInput(nodeId: string): unknown;
  setOutput(key: OutputSchemaSourceKey, value: unknown): void;
  getOutput<T>(key: OutputSchemaSourceKey): T | undefined;
  snapshot(): {
    query: Record<string, unknown>;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
  };
}

export function createRuntimeState({
  workflow,
  query,
}: {
  workflow: WorkflowData;
  query: Record<string, unknown>;
}): WorkflowRuntimeState {
  const state = {
    query,
    inputs: {} as Record<string, unknown>,
    outputs: {} as Record<string, unknown>,
    nodes: workflow.nodes,
    edges: workflow.edges,
    setInput(nodeId: string, value: unknown) {
      state.inputs = {
        ...state.inputs,
        [nodeId]: value,
      };
    },
    getInput(nodeId: string) {
      return state.inputs[nodeId];
    },
    setOutput(key: OutputSchemaSourceKey, value: unknown) {
      const current = (state.outputs[key.nodeId] ?? {}) as Record<
        string,
        unknown
      >;
      state.outputs = {
        ...state.outputs,
        [key.nodeId]: setValueByPath(current, key.path, value),
      };
    },
    getOutput<T>(key: OutputSchemaSourceKey): T | undefined {
      const output = state.outputs[key.nodeId];
      const found = getValueByPath(output, key.path);
      if (found !== undefined) {
        return found as T;
      }

      const targetNode = state.nodes.find((node) => node.id === key.nodeId);
      const schema = targetNode?.data.outputSchema ?? defaultObjectJsonSchema;
      const targetSchema =
        key.path.length === 0
          ? schema
          : findJsonSchemaByPath(schema, [...key.path]);

      if (targetSchema?.default !== undefined) {
        return targetSchema.default as unknown as T;
      }

      return undefined;
    },
    snapshot() {
      return {
        query: state.query,
        inputs: state.inputs,
        outputs: state.outputs,
      };
    },
  };

  return state;
}
