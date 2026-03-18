import { customModelProvider } from "lib/ai/models";
import {
  ConditionNodeData,
  OutputNodeData,
  LLMNodeData,
  InputNodeData,
  WorkflowNodeData,
  ToolNodeData,
  HttpNodeData,
  TemplateNodeData,
  CustomNodeData,
  PythonScriptNodeData,
  OutputSchemaSourceKey,
} from "../workflow.interface";
import { runPythonScript } from "lib/run-python";
import { WorkflowRuntimeState } from "./graph-store";
import {
  convertToModelMessages,
  generateObject,
  generateText,
  UIMessage,
} from "ai";
import { checkConditionBranch } from "../condition";
import {
  convertTiptapJsonToAiMessage,
  convertTiptapJsonToText,
} from "../shared.workflow";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { toAny } from "lib/utils";
import { AppError } from "lib/errors";

export type NodeExecutor<T extends WorkflowNodeData = any> = (input: {
  node: T;
  state: WorkflowRuntimeState;
}) =>
  | Promise<{
      input?: any;
      output?: any;
    }>
  | {
      input?: any;
      output?: any;
    };

export const inputNodeExecutor: NodeExecutor<InputNodeData> = ({ state }) => {
  return {
    output: state.query,
  };
};

export const outputNodeExecutor: NodeExecutor<OutputNodeData> = ({
  node,
  state,
}) => {
  return {
    output: node.outputData.reduce((acc, cur) => {
      acc[cur.key] = state.getOutput(cur.source!);
      return acc;
    }, {} as object),
  };
};

export const customNodeExecutor: NodeExecutor<CustomNodeData> = ({
  node,
  state,
}) => {
  return {
    output: (node.outputData ?? []).reduce((acc, cur) => {
      if (cur.source) acc[cur.key] = state.getOutput(cur.source);
      return acc;
    }, {} as object),
  };
};

export const llmNodeExecutor: NodeExecutor<LLMNodeData> = async ({
  node,
  state,
}) => {
  // workflow-AI uses languageModel() instead of getModel()
  const modelId = `${node.model.provider}:${node.model.model}`;
  const model = customModelProvider.languageModel(modelId);

  const messages: Omit<UIMessage, "id">[] = node.messages.map((message) =>
    convertTiptapJsonToAiMessage({
      role: message.role,
      getOutput: state.getOutput,
      json: message.content,
    }),
  );

  const isTextResponse =
    node.outputSchema.properties?.answer?.type === "string";

  state.setInput(node.id, {
    chatModel: node.model,
    messages,
    responseFormat: isTextResponse ? "text" : "object",
  });

  if (isTextResponse) {
    const response = await generateText({
      model,
      messages: convertToModelMessages(messages),
    });
    return {
      output: {
        totalTokens: response.usage.totalTokens,
        answer: response.text,
      },
    };
  }

  const response = await generateObject({
    model,
    messages: convertToModelMessages(messages),
    schema: jsonSchemaToZod(node.outputSchema.properties.answer),
    maxRetries: 3,
  });

  return {
    output: {
      totalTokens: response.usage.totalTokens,
      answer: response.object,
    },
  };
};

export const conditionNodeExecutor: NodeExecutor<ConditionNodeData> = async ({
  node,
  state,
}) => {
  const okBranch =
    [node.branches.if, ...(node.branches.elseIf || [])].find((branch) => {
      return checkConditionBranch(branch, state.getOutput);
    }) || node.branches.else;

  const nextNodes = state.edges
    .filter(
      (edge) =>
        edge.uiConfig.sourceHandle === okBranch.id && edge.source == node.id,
    )
    .map((edge) => state.nodes.find((node) => node.id === edge.target)!)
    .filter(Boolean);

  return {
    output: {
      type: okBranch.type,
      branch: okBranch.id,
      nextNodes,
    },
  };
};

export const toolNodeExecutor: NodeExecutor<ToolNodeData> = async ({
  node,
  state,
}) => {
  const result: { input: any; output: any } = {
    input: undefined,
    output: undefined,
  };

  if (!node.tool) throw new Error("Tool not found");

  if (!node.tool?.parameterSchema) {
    result.input = { parameter: undefined };
  } else {
    const prompt: string | undefined = node.message
      ? toAny(
          convertTiptapJsonToAiMessage({
            role: "user",
            getOutput: state.getOutput,
            json: node.message,
          }),
        ).parts[0]?.text
      : undefined;

    const modelId = `${node.model?.provider ?? "openai"}:${node.model?.model ?? "gpt-4o"}`;
    const response = await generateText({
      model: customModelProvider.languageModel(modelId),
      toolChoice: "required",
      prompt: prompt || "",
      tools: {
        [node.tool.id]: {
          description: node.tool.description,
          inputSchema: jsonSchemaToZod(node.tool.parameterSchema),
        },
      },
    });

    result.input = {
      parameter: response.toolCalls.find((call) => call.input)?.input,
      prompt,
    };
  }

  // MCP tool execution — returns mock if mcpClientsManager not available
  result.output = {
    tool_result: {
      note: "Tool execution requires MCP client setup",
      tool: node.tool.id,
      parameter: result.input?.parameter,
    },
  };

  return result;
};

function resolveHttpValue(
  value: string | OutputSchemaSourceKey | undefined,
  getOutput: WorkflowRuntimeState["getOutput"],
): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  const output = getOutput(value);
  if (output === undefined || output === null) return "";
  if (typeof output === "string" || typeof output === "number") {
    return output.toString();
  }
  return JSON.stringify(output);
}

export const httpNodeExecutor: NodeExecutor<HttpNodeData> = async ({
  node,
  state,
}) => {
  const timeout = node.timeout || 30000;
  const url = resolveHttpValue(node.url, state.getOutput);

  if (!url) throw new Error("HTTP node requires a URL");

  const searchParams = new URLSearchParams();
  for (const queryParam of node.query || []) {
    if (queryParam.key && queryParam.value !== undefined) {
      const value = resolveHttpValue(queryParam.value, state.getOutput);
      if (value) searchParams.append(queryParam.key, value);
    }
  }

  const finalUrl = searchParams.toString()
    ? `${url}${url.includes("?") ? "&" : "?"}${searchParams.toString()}`
    : url;

  const headers: Record<string, string> = {};
  for (const header of node.headers || []) {
    if (header.key && header.value !== undefined) {
      const value = resolveHttpValue(header.value, state.getOutput);
      if (value) headers[header.key] = value;
    }
  }

  let body: string | undefined;
  if (node.body && ["POST", "PUT", "PATCH"].includes(node.method)) {
    body = resolveHttpValue(node.body, state.getOutput);
    if (body && !headers["Content-Type"] && !headers["content-type"]) {
      try {
        JSON.parse(body);
        headers["Content-Type"] = "application/json";
      } catch {
        headers["Content-Type"] = "text/plain";
      }
    }
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(finalUrl, {
      method: node.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseBody = "";
    try {
      responseBody = await response.text();
    } catch {}

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const duration = Date.now() - startTime;
    const request = { url: finalUrl, method: node.method, headers, body, timeout };
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: responseHeaders,
      body: responseBody,
      duration,
    };

    if (!response.ok) {
      state.setInput(node.id, { request, response: responseData });
      throw new AppError(response.status.toString(), response.statusText);
    }

    return { input: { request }, output: { response: responseData } };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    const duration = Date.now() - startTime;
    let errorMessage = error.message;
    let errorType = "unknown";
    if (error.name === "AbortError") {
      errorMessage = `Request timeout after ${timeout}ms`;
      errorType = "timeout";
    }
    state.setInput(node.id, {
      request: { url: finalUrl, method: node.method, headers, body, timeout },
      response: { status: 0, statusText: errorMessage, ok: false, headers: {}, body: "", duration, error: { type: errorType, message: errorMessage } },
    });
    throw error;
  }
};

export const templateNodeExecutor: NodeExecutor<TemplateNodeData> = ({
  node,
  state,
}) => {
  let text = "";
  if (node.template.type == "tiptap") {
    text = convertTiptapJsonToText({
      getOutput: state.getOutput,
      json: node.template.tiptap,
    });
  }
  return { output: { template: text } };
};

export const pythonScriptExecutor: NodeExecutor<PythonScriptNodeData> = async ({
  node,
  state,
}) => {
  const inputs = node.inputs ?? [{ id: "in0", name: "IN[0]" }];
  const rawValues = inputs.map((input) => {
    const edge = state.edges.find(
      (e) =>
        e.target === node.id &&
        (e.uiConfig?.targetHandle === input.id || e.uiConfig?.targetHandle === input.name),
    );
    if (!edge) return undefined;
    return state.getOutput({ nodeId: edge.source, path: [] });
  });
  const fallback = rawValues.find((v) => v !== undefined);
  const inputValues = rawValues.map((v) => (v !== undefined ? v : fallback));
  const code = node.code ?? "";
  if (!code.trim()) {
    return { output: { OUT: undefined } };
  }
  const OUT = await runPythonScript(code, inputValues);
  return { output: { OUT } };
};
