import type {
  JsonSchema,
  WorkflowData,
  WorkflowModelRef,
  WorkflowToolDefinition,
} from "@/src/core/types";

export type WorkflowModelMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export interface WorkflowModelProvider {
  generateText(args: {
    model: WorkflowModelRef;
    messages: WorkflowModelMessage[];
  }): Promise<{
    text: string;
    totalTokens?: number;
  }>;
  generateObject(args: {
    model: WorkflowModelRef;
    messages: WorkflowModelMessage[];
    schema: JsonSchema;
  }): Promise<{
    object: unknown;
    totalTokens?: number;
  }>;
}

export interface WorkflowToolExecutor {
  execute(args: {
    tool: WorkflowToolDefinition;
    input: unknown;
    workflow: WorkflowData;
  }): Promise<unknown>;
}

export interface WorkflowMcpClient {
  callTool(args: {
    serverId: string;
    toolId: string;
    input: unknown;
  }): Promise<unknown>;
}

export interface WorkflowLogger {
  debug(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export interface WorkflowHttpClient {
  fetch(input: string, init: RequestInit): Promise<Response>;
}

export type WorkflowAdapters = {
  modelProvider?: WorkflowModelProvider;
  toolExecutor?: WorkflowToolExecutor;
  mcpClient?: WorkflowMcpClient;
  logger?: WorkflowLogger;
  httpClient?: WorkflowHttpClient;
};

export const consoleWorkflowLogger: WorkflowLogger = {
  debug(message, meta) {
    if (meta === undefined) {
      console.debug(message);
      return;
    }
    console.debug(message, meta);
  },
  error(message, meta) {
    if (meta === undefined) {
      console.error(message);
      return;
    }
    console.error(message, meta);
  },
};
