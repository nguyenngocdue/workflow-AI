import {
  NodeKind,
  type ConditionNodeData,
  type HttpNodeData,
  type LLMNodeData,
  type OutputNodeData,
  type OutputSchemaSourceKey,
  type TemplateNodeData,
  type ToolNodeData,
  type WorkflowData,
  type WorkflowEdge,
  type WorkflowExecutionResult,
  type WorkflowNode,
  type WorkflowNodeData,
  type WorkflowNodeHistory,
  type WorkflowRuntimeEvent,
} from "@/src/core/types";
import {
  addBranchLabels,
  buildNeedTable,
  buildOutgoingMap,
  resolveHttpValue,
} from "@/src/core/executor.helpers";
import { checkConditionBranch } from "@/src/core/condition";
import { createRuntimeState, type WorkflowRuntimeState } from "@/src/core/runtime";
import { cloneValue, convertRichTextToText, getInputNode, getOutputNode } from "@/src/core/utils";
import {
  consoleWorkflowLogger,
  type WorkflowAdapters,
  type WorkflowModelMessage,
} from "@/src/infrastructure/adapters";

type NodeExecutor<T extends WorkflowNodeData = WorkflowNodeData> = (args: {
  node: T;
  state: WorkflowRuntimeState;
  workflow: WorkflowData;
  adapters: WorkflowAdapters;
}) => Promise<{
  input?: unknown;
  output?: unknown;
}>;

export type WorkflowAgent = {
  run(input: Record<string, unknown>): Promise<WorkflowExecutionResult>;
  subscribe(listener: (event: WorkflowRuntimeEvent) => void): () => void;
};

export function createWorkflowAgent({
  workflow,
  adapters = {},
}: {
  workflow: WorkflowData;
  adapters?: WorkflowAdapters;
}): WorkflowAgent {
  const preparedFlow = cloneValue(workflow);
  const listeners = new Set<(event: WorkflowRuntimeEvent) => void>();
  const logger = adapters.logger ?? consoleWorkflowLogger;

  addBranchLabels(preparedFlow.nodes, preparedFlow.edges);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async run(input) {
      const startTime = Date.now();
      const state = createRuntimeState({
        workflow: preparedFlow,
        query: input,
      });
      const events: WorkflowRuntimeEvent[] = [];
      const histories: WorkflowNodeHistory[] = [];
      const executedNodes = new Set<string>();
      const seenLabelsByNode = new Map<string, Set<string>>();
      const needTable = buildNeedTable(preparedFlow.edges);
      const outgoingMap = buildOutgoingMap(preparedFlow.edges);
      const inputNode = getInputNode(preparedFlow);
      const outputNode = getOutputNode(preparedFlow);

      if (!inputNode) {
        return {
          isOk: false,
          error: "Workflow is missing an input node",
          histories,
          events,
          state: state.snapshot(),
        };
      }

      const emit = (event: WorkflowRuntimeEvent) => {
        events.push(event);
        listeners.forEach((listener) => listener(event));
      };

      emit({
        eventType: "WORKFLOW_START",
        startedAt: startTime,
        input,
      });

      try {
        await visit({
          node: inputNode,
          branchLabel: "B0",
        });

        const finalOutput = outputNode
          ? state.getOutput({
              nodeId: outputNode.id,
              path: [],
            })
          : undefined;

        const endEvent: WorkflowRuntimeEvent = {
          eventType: "WORKFLOW_END",
          startedAt: startTime,
          endedAt: Date.now(),
          isOk: true,
        };
        emit(endEvent);

        return {
          isOk: true,
          output: finalOutput,
          histories,
          events,
          state: state.snapshot(),
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown workflow error";
        logger.error("Workflow execution failed", message);
        emit({
          eventType: "WORKFLOW_END",
          startedAt: startTime,
          endedAt: Date.now(),
          isOk: false,
          error: message,
        });
        return {
          isOk: false,
          error: message,
          histories,
          events,
          state: state.snapshot(),
        };
      }

      async function visit({
        node,
        branchLabel,
      }: {
        node: WorkflowNode;
        branchLabel: string;
      }) {
        const requiredLabelCount = needTable[node.id];
        if (requiredLabelCount) {
          const seen = seenLabelsByNode.get(node.id) ?? new Set<string>();
          if (seen.has(branchLabel)) {
            emitSkip(branchLabel);
            return;
          }
          seen.add(branchLabel);
          seenLabelsByNode.set(node.id, seen);
          if (seen.size < requiredLabelCount) {
            emitSkip(branchLabel);
            return;
          }
        }

        if (executedNodes.has(node.id)) {
          return;
        }
        executedNodes.add(node.id);

        const startedAt = Date.now();
        emit({
          eventType: "NODE_START",
          startedAt,
          node: {
            id: node.id,
            name: node.data.name,
            kind: node.data.kind,
          },
        });

        const history: WorkflowNodeHistory = {
          id: `${node.id}-${startedAt}`,
          nodeId: node.id,
          name: node.data.name,
          kind: node.data.kind,
          startedAt,
          status: "running",
        };
        histories.push(history);

        try {
          const executor = getExecutor(node.data.kind);
          const result = await executor({
            node: node.data as never,
            state,
            workflow: preparedFlow,
            adapters,
          });

          if (result.output !== undefined) {
            state.setOutput(
              {
                nodeId: node.id,
                path: [],
              },
              result.output,
            );
          }
          if (result.input !== undefined) {
            state.setInput(node.id, result.input);
          }

          history.endedAt = Date.now();
          history.status = "success";
          history.result = {
            input: result.input,
            output: result.output,
          };

          emit({
            eventType: "NODE_END",
            startedAt,
            endedAt: history.endedAt,
            isOk: true,
            node: {
              id: node.id,
              name: node.data.name,
              kind: node.data.kind,
            },
            output: result.output,
          });

          const outgoing = resolveOutgoingEdges(node, state, outgoingMap);
          for (const edge of outgoing) {
            const nextNode = preparedFlow.nodes.find((candidate) => candidate.id === edge.target);
            if (!nextNode) {
              continue;
            }
            await visit({
              node: nextNode,
              branchLabel: edge.label ?? branchLabel,
            });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown node execution error";
          history.endedAt = Date.now();
          history.status = "fail";
          history.error = message;
          emit({
            eventType: "NODE_END",
            startedAt,
            endedAt: history.endedAt,
            isOk: false,
            error: message,
            node: {
              id: node.id,
              name: node.data.name,
              kind: node.data.kind,
            },
          });
          throw error;
        }
      }

      function emitSkip(branchLabel: string) {
        const startedAt = Date.now();
        emit({
          eventType: "NODE_START",
          startedAt,
          node: {
            id: `skip-${branchLabel}-${startedAt}`,
            name: "SKIP",
            kind: "skip",
          },
        });
        emit({
          eventType: "NODE_END",
          startedAt,
          endedAt: Date.now(),
          isOk: true,
          node: {
            id: `skip-${branchLabel}-${startedAt}`,
            name: "SKIP",
            kind: "skip",
          },
        });
      }
    },
  };
}

function getExecutor(kind: NodeKind): NodeExecutor<any> {
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
    case NodeKind.Note:
      return noteNodeExecutor;
    case NodeKind.Code:
      return async () => {
        throw new Error("Code node is declared but not implemented");
      };
  }
}

const inputNodeExecutor: NodeExecutor<Extract<WorkflowNodeData, { kind: NodeKind.Input }>> =
  async ({ state }) => ({
    output: state.query,
  });

const outputNodeExecutor: NodeExecutor<OutputNodeData> = async ({
  node,
  state,
}) => ({
  output: node.outputData.reduce<Record<string, unknown>>((acc, current) => {
    if (current.source) {
      acc[current.key] = state.getOutput(current.source);
    }
    return acc;
  }, {}),
});

const llmNodeExecutor: NodeExecutor<LLMNodeData> = async ({
  node,
  state,
  adapters,
}) => {
  if (!node.model) {
    throw new Error("LLM node must have a model");
  }
  const provider = adapters.modelProvider;
  if (!provider) {
    throw new Error("No model provider configured");
  }

  const messages: WorkflowModelMessage[] = node.messages.map((message) => ({
    role: message.role,
    content: message.content
      ? convertRichTextToText({
          document: message.content,
          getOutput: state.getOutput,
        })
      : "",
  }));

  const isTextResponse = node.outputSchema.properties?.answer?.type === "string";
  state.setInput(node.id, {
    chatModel: node.model,
    messages,
    responseFormat: isTextResponse ? "text" : "object",
  });

  if (isTextResponse) {
    const response = await provider.generateText({
      model: node.model,
      messages,
    });
    return {
      output: {
        totalTokens: response.totalTokens,
        answer: response.text,
      },
    };
  }

  const response = await provider.generateObject({
    model: node.model,
    messages,
    schema: node.outputSchema.properties?.answer ?? {
      type: "object",
      properties: {},
    },
  });
  return {
    output: {
      totalTokens: response.totalTokens,
      answer: response.object,
    },
  };
};

const conditionNodeExecutor: NodeExecutor<ConditionNodeData> = async ({
  node,
  state,
}) => {
  const okBranch =
    [node.branches.if, ...(node.branches.elseIf ?? [])].find((branch) =>
      checkConditionBranch(branch, state.getOutput),
    ) ?? node.branches.else;

  return {
    output: {
      type: okBranch.type,
      branch: okBranch.id,
    },
  };
};

const toolNodeExecutor: NodeExecutor<ToolNodeData> = async ({
  node,
  state,
  workflow,
  adapters,
}) => {
  if (!node.tool) {
    throw new Error("Tool not found");
  }

  let parameter: unknown;
  let prompt: string | undefined;

  if (node.tool.parameterSchema) {
    if (!node.model) {
      throw new Error("Tool node must have a model");
    }
    if (!node.message) {
      throw new Error("Tool node must have a message");
    }
    if (!adapters.modelProvider) {
      throw new Error("No model provider configured for tool parameter generation");
    }
    prompt = convertRichTextToText({
      document: node.message,
      getOutput: state.getOutput,
    });
    const response = await adapters.modelProvider.generateObject({
      model: node.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      schema: node.tool.parameterSchema,
    });
    parameter = response.object;
  }

  const input = {
    parameter,
    prompt,
  };

  state.setInput(node.id, input);

  if (node.tool.type === "mcp-tool") {
    if (!adapters.mcpClient) {
      throw new Error("No MCP client configured");
    }
    return {
      input,
      output: {
        tool_result: await adapters.mcpClient.callTool({
          serverId: node.tool.serverId,
          toolId: node.tool.id,
          input: parameter,
        }),
      },
    };
  }

  if (!adapters.toolExecutor) {
    throw new Error("No tool executor configured");
  }

  return {
    input,
    output: {
      tool_result: await adapters.toolExecutor.execute({
        tool: node.tool,
        input: parameter,
        workflow,
      }),
    },
  };
};

const httpNodeExecutor: NodeExecutor<HttpNodeData> = async ({
  node,
  state,
  adapters,
}) => {
  const httpClient = adapters.httpClient ?? {
    fetch: (input: string, init: RequestInit) => fetch(input, init),
  };
  const timeout = node.timeout || 30000;
  const url = resolveHttpValue(node.url, state.getOutput);

  if (!url) {
    throw new Error("HTTP node requires a URL");
  }

  const searchParams = new URLSearchParams();
  node.query.forEach((query) => {
    if (query.key && query.value !== undefined) {
      const value = resolveHttpValue(query.value, state.getOutput);
      if (value) {
        searchParams.append(query.key, value);
      }
    }
  });

  const finalUrl = searchParams.toString()
    ? `${url}${url.includes("?") ? "&" : "?"}${searchParams.toString()}`
    : url;

  const headers: Record<string, string> = {};
  node.headers.forEach((header) => {
    if (header.key && header.value !== undefined) {
      const value = resolveHttpValue(header.value, state.getOutput);
      if (value) {
        headers[header.key] = value;
      }
    }
  });

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startedAt = Date.now();

  try {
    const response = await httpClient.fetch(finalUrl, {
      method: node.method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const responseBody = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const request = {
      url: finalUrl,
      method: node.method,
      headers,
      body,
      timeout,
    };
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: responseHeaders,
      body: responseBody,
      duration: Date.now() - startedAt,
      size: response.headers.get("content-length")
        ? Number.parseInt(response.headers.get("content-length")!, 10)
        : undefined,
    };

    if (!response.ok) {
      state.setInput(node.id, {
        request,
        response: responseData,
      });
      throw new Error(response.statusText || `HTTP ${response.status}`);
    }

    return {
      input: {
        request,
      },
      output: {
        response: responseData,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const message =
      error instanceof Error ? error.message : "Unknown HTTP request error";
    state.setInput(node.id, {
      request: {
        url: finalUrl,
        method: node.method,
        headers,
        body,
        timeout,
      },
      response: {
        status: 0,
        statusText: message,
        ok: false,
        headers: {},
        body: "",
        duration: Date.now() - startedAt,
      },
    });
    throw error;
  }
};

const templateNodeExecutor: NodeExecutor<TemplateNodeData> = async ({
  node,
  state,
}) => ({
  output: {
    template:
      node.template.type === "tiptap"
        ? convertRichTextToText({
            document: node.template.tiptap,
            getOutput: state.getOutput,
          })
        : "",
  },
});

const noteNodeExecutor: NodeExecutor<Extract<WorkflowNodeData, { kind: NodeKind.Note }>> =
  async () => ({
    output: {},
  });

function resolveOutgoingEdges(
  node: WorkflowNode,
  state: WorkflowRuntimeState,
  outgoingMap: Map<string, WorkflowEdge[]>,
): WorkflowEdge[] {
  const outgoing = outgoingMap.get(node.id) ?? [];
  if (node.data.kind !== NodeKind.Condition) {
    return outgoing;
  }

  const branch = state.getOutput<string>({
    nodeId: node.id,
    path: ["branch"],
  });

  return outgoing.filter((edge) => edge.sourceHandle === branch);
}
