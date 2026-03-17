import {
  InputNodeData,
  OutputNodeData,
  LLMNodeData,
  ConditionNodeData,
  ToolNodeData,
  HttpNodeData,
  TemplateNodeData,
  WorkflowNodeData,
} from "lib/ai/workflow/workflow.interface";
import { WorkflowRuntimeState } from "./graph-store";

export type NodeExecutor<T extends WorkflowNodeData = any> = (input: {
  node: T;
  state: WorkflowRuntimeState;
  emit?: (event: any) => void;
}) => Promise<any> | any;

export const inputNodeExecutor: NodeExecutor<InputNodeData> = ({ state }) => {
  return state.inputs || {};
};

export const outputNodeExecutor: NodeExecutor<OutputNodeData> = ({ node, state }) => {
  const result: Record<string, any> = {};
  for (const item of node.outputData) {
    if (item.source) {
      const nodeOutput = state.nodeOutputs?.[item.source.nodeId];
      let value = nodeOutput;
      for (const pathKey of item.source.path) {
        value = value?.[pathKey];
      }
      result[item.key] = value;
    }
  }
  return result;
};

export const llmNodeExecutor: NodeExecutor<LLMNodeData> = async () => {
  throw new Error("LLM execution requires API configuration");
};

export const conditionNodeExecutor: NodeExecutor<ConditionNodeData> = async () => {
  throw new Error("Condition execution not available in standalone mode");
};

export const toolNodeExecutor: NodeExecutor<ToolNodeData> = async () => {
  throw new Error("Tool execution requires API configuration");
};

export const httpNodeExecutor: NodeExecutor<HttpNodeData> = async () => {
  throw new Error("HTTP execution not available in standalone mode");
};

export const templateNodeExecutor: NodeExecutor<TemplateNodeData> = ({ node }) => {
  return { template: "" };
};
