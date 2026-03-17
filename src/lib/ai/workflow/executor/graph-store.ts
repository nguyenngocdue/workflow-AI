import { OutputSchemaSourceKey } from "../workflow.interface";
import { DBEdge, DBNode } from "app-types/workflow";

export interface WorkflowRuntimeState {
  query: Record<string, unknown>;
  inputs: {
    [nodeId: string]: any;
  };
  nodeOutputs?: {
    [nodeId: string]: any;
  };
  nodes: DBNode[];
  edges: DBEdge[];
  outputs: {
    [nodeId: string]: any;
  };
  setInput(nodeId: string, value: any): void;
  getInput(nodeId: string): any;
  setOutput(key: OutputSchemaSourceKey, value: any): void;
  getOutput<T>(key: OutputSchemaSourceKey): undefined | T;
}

export const createGraphStore = (params: {
  nodes: DBNode[];
  edges: DBEdge[];
}): WorkflowRuntimeState => {
  const state: WorkflowRuntimeState = {
    query: {},
    outputs: {},
    inputs: {},
    nodes: params.nodes,
    edges: params.edges,
    setInput(nodeId, value) {
      state.inputs[nodeId] = value;
    },
    getInput(nodeId) {
      return state.inputs[nodeId];
    },
    setOutput(key, value) {
      if (!state.outputs[key.nodeId]) state.outputs[key.nodeId] = {};
      let obj = state.outputs[key.nodeId];
      for (let i = 0; i < key.path.length - 1; i++) {
        if (!obj[key.path[i]]) obj[key.path[i]] = {};
        obj = obj[key.path[i]];
      }
      obj[key.path[key.path.length - 1]] = value;
    },
    getOutput<T>(key: OutputSchemaSourceKey): undefined | T {
      let result: any = state.outputs[key.nodeId];
      for (const p of key.path) {
        result = result?.[p];
      }
      return result as T;
    },
  };
  return state;
};
