"use client";

import { useMemo, useState } from "react";
import {
  NodeKind,
  type ConditionBranch,
  type ConditionRule,
  type HttpNodeData,
  type JsonSchema,
  type LLMNodeData,
  type OutputNodeData,
  type ToolNodeData,
  type WorkflowData,
  type WorkflowNode,
  type WorkflowNodeData,
} from "@/src/core/types";
import {
  createBranch,
  createConditionRule,
  createOutputMapping,
  createSchemaField,
  fieldsToObjectSchema,
  getFieldTypeOptions,
  getNodeReferenceOptions,
  plainTextToRichText,
  richTextToEditorText,
  schemaFieldsFromObjectSchema,
} from "@/src/features/editor/workflow-editor-utils";

type WorkflowNodeInspectorProps = {
  flow: WorkflowData;
  node?: WorkflowNode;
  onChange: (node: WorkflowNodeData) => void;
  onDelete: (nodeId: string) => void;
};

const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "is_empty",
  "is_not_empty",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "is_true",
  "is_false",
] as const;

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"] as const;

export function WorkflowNodeInspector({
  flow,
  node,
  onChange,
  onDelete,
}: WorkflowNodeInspectorProps) {
  const referenceOptions = useMemo(() => {
    if (!node) {
      return [];
    }
    return getNodeReferenceOptions(flow, node.id);
  }, [flow, node]);

  if (!node) {
    return (
      <div className="inspector-empty">
        <h3 className="panel-title">Node Inspector</h3>
        <p className="panel-copy">
          Select a node on the canvas to edit its config, schema, prompt or
          branching rules.
        </p>
        {flow.nodes.length <= 2 && (
          <div className="notice" style={{ marginTop: 8 }}>
            Add nodes from the palette on the left and connect them to build
            your workflow. Each node type serves a different purpose: LLM for
            AI calls, Condition for branching, Template for text rendering, and
            more.
          </div>
        )}
      </div>
    );
  }

  const current = node.data;

  function patchBase(fields: Partial<WorkflowNodeData>) {
    onChange({
      ...current,
      ...fields,
    } as WorkflowNodeData);
  }

  return (
    <div className="inspector-shell">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Node Inspector</h3>
          <p className="panel-copy">
            Edit config for <strong>{current.name}</strong> ({current.kind})
          </p>
        </div>
        {current.kind !== NodeKind.Input && (
          <button
            className="button button-subtle"
            onClick={() => onDelete(node.id)}
            type="button"
          >
            Delete Node
          </button>
        )}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-name">
          Name
        </label>
        <input
          id="node-name"
          className="input"
          value={current.name}
          onChange={(event) => patchBase({ name: event.target.value })}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="node-description">
          Description
        </label>
        <textarea
          id="node-description"
          className="editor small"
          value={current.description ?? ""}
          onChange={(event) => patchBase({ description: event.target.value })}
        />
      </div>

      {current.kind === NodeKind.Input && (
        <InputNodeEditor
          node={current}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.Output && (
        <OutputNodeEditor
          node={current}
          references={referenceOptions}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.Condition && (
        <ConditionNodeEditor
          node={current}
          references={referenceOptions}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.Template && (
        <TemplateNodeEditor
          node={current}
          references={referenceOptions}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.LLM && (
        <LlmNodeEditor
          node={current}
          references={referenceOptions}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.Tool && (
        <ToolNodeEditor
          node={current}
          references={referenceOptions}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.Http && (
        <HttpNodeEditor
          node={current}
          onChange={(nextNode) => onChange(nextNode)}
        />
      )}
      {current.kind === NodeKind.Note && (
        <div className="notice">
          Notes only use the shared description field. They stay out of runtime
          execution and work as design-time documentation.
        </div>
      )}
    </div>
  );
}

function InputNodeEditor({
  node,
  onChange,
}: {
  node: Extract<WorkflowNodeData, { kind: NodeKind.Input }>;
  onChange: (node: Extract<WorkflowNodeData, { kind: NodeKind.Input }>) => void;
}) {
  const fields = schemaFieldsFromObjectSchema(node.outputSchema);

  return (
    <div className="stack stack-tight">
      <div className="section-label">Input Schema</div>
      <SchemaFieldsEditor
        fields={fields}
        onChange={(nextFields) =>
          onChange({
            ...node,
            outputSchema: fieldsToObjectSchema(nextFields),
          })
        }
      />
    </div>
  );
}

function OutputNodeEditor({
  node,
  references,
  onChange,
}: {
  node: OutputNodeData;
  references: ReturnType<typeof getNodeReferenceOptions>;
  onChange: (node: OutputNodeData) => void;
}) {
  return (
    <div className="stack stack-tight">
      <div className="section-label">Output Mapping</div>
      {node.outputData.map((mapping, index) => (
        <div className="mapping-card" key={`${mapping.key}-${index}`}>
          <div className="field">
            <label className="field-label">Output Key</label>
            <input
              className="input"
              value={mapping.key}
              onChange={(event) =>
                onChange({
                  ...node,
                  outputData: node.outputData.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          key: event.target.value,
                        }
                      : item,
                  ),
                })
              }
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <label className="field-label">Source Node</label>
              <select
                className="input"
                value={mapping.source?.nodeId ?? ""}
                onChange={(event) =>
                  onChange({
                    ...node,
                    outputData: node.outputData.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            source: {
                              nodeId: event.target.value,
                              path: item.source?.path ?? [],
                            },
                          }
                        : item,
                    ),
                  })
                }
              >
                <option value="">Select node</option>
                {references.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.name} ({reference.kind})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label">Path</label>
              <input
                className="input"
                placeholder="field.subfield"
                value={mapping.source?.path.join(".") ?? ""}
                onChange={(event) =>
                  onChange({
                    ...node,
                    outputData: node.outputData.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            source: item.source
                              ? {
                                  ...item.source,
                                  path: event.target.value
                                    .split(".")
                                    .map((part) => part.trim())
                                    .filter(Boolean),
                                }
                              : undefined,
                          }
                        : item,
                    ),
                  })
                }
              />
            </div>
          </div>

          <button
            className="button button-subtle"
            type="button"
            onClick={() =>
              onChange({
                ...node,
                outputData: node.outputData.filter((_, itemIndex) => itemIndex !== index),
              })
            }
          >
            Remove Mapping
          </button>
        </div>
      ))}

      <button
        className="button button-primary"
        type="button"
        onClick={() =>
          onChange({
            ...node,
            outputData: [...node.outputData, createOutputMapping(references[0]?.id)],
          })
        }
      >
        Add Mapping
      </button>
    </div>
  );
}

function ConditionNodeEditor({
  node,
  references,
  onChange,
}: {
  node: Extract<WorkflowNodeData, { kind: NodeKind.Condition }>;
  references: ReturnType<typeof getNodeReferenceOptions>;
  onChange: (
    node: Extract<WorkflowNodeData, { kind: NodeKind.Condition }>,
  ) => void;
}) {
  const branches: ConditionBranch[] = [
    node.branches.if,
    ...(node.branches.elseIf ?? []),
    node.branches.else,
  ];

  function patchBranch(index: number, nextBranch: ConditionBranch) {
    const nextBranches = branches.map((branch, branchIndex) =>
      branchIndex === index ? nextBranch : branch,
    );
    onChange({
      ...node,
      branches: {
        if: nextBranches[0],
        elseIf: nextBranches.slice(1, -1),
        else: nextBranches[nextBranches.length - 1],
      },
    });
  }

  function removeElseIf(index: number) {
    const nextBranches = branches.filter((_, branchIndex) => branchIndex !== index);
    onChange({
      ...node,
      branches: {
        if: nextBranches[0],
        elseIf: nextBranches.slice(1, -1),
        else: nextBranches[nextBranches.length - 1],
      },
    });
  }

  return (
    <div className="stack stack-tight">
      <div className="section-label">Branch Rules</div>
      {branches.map((branch, index) => (
        <div className="mapping-card" key={branch.id}>
          <div className="panel-header compact">
            <strong>
              {branch.type} <span className="muted">({branch.id})</span>
            </strong>
            {branch.type === "elseIf" && (
              <button
                className="button button-subtle"
                type="button"
                onClick={() => removeElseIf(index)}
              >
                Remove
              </button>
            )}
          </div>

          {branch.type !== "else" && (
            <>
              <div className="field-grid">
                <div className="field">
                  <label className="field-label">Branch Id</label>
                  <input
                    className="input"
                    value={branch.id}
                    onChange={(event) =>
                      patchBranch(index, {
                        ...branch,
                        id: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="field">
                  <label className="field-label">Logical Operator</label>
                  <select
                    className="input"
                    value={branch.logicalOperator}
                    onChange={(event) =>
                      patchBranch(index, {
                        ...branch,
                        logicalOperator: event.target.value as ConditionBranch["logicalOperator"],
                      })
                    }
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              </div>

              {branch.conditions.map((condition, conditionIndex) => (
                <ConditionRuleEditor
                  key={`${branch.id}-${conditionIndex}`}
                  condition={condition}
                  references={references}
                  onChange={(nextCondition) =>
                    patchBranch(index, {
                      ...branch,
                      conditions: branch.conditions.map((item, itemIndex) =>
                        itemIndex === conditionIndex ? nextCondition : item,
                      ),
                    })
                  }
                  onDelete={() =>
                    patchBranch(index, {
                      ...branch,
                      conditions: branch.conditions.filter(
                        (_, itemIndex) => itemIndex !== conditionIndex,
                      ),
                    })
                  }
                />
              ))}

              <button
                className="button button-subtle"
                type="button"
                onClick={() =>
                  patchBranch(index, {
                    ...branch,
                    conditions: [
                      ...branch.conditions,
                      createConditionRule(references[0]?.id ?? ""),
                    ],
                  })
                }
              >
                Add Condition
              </button>
            </>
          )}
        </div>
      ))}

      <button
        className="button button-primary"
        type="button"
        onClick={() => {
          const elseIf = node.branches.elseIf ?? [];
          onChange({
            ...node,
            branches: {
              ...node.branches,
              elseIf: [
                ...elseIf,
                createBranch(`elseif-${elseIf.length + 1}`, "elseIf"),
              ],
            },
          });
        }}
      >
        Add Else If
      </button>
    </div>
  );
}

function ConditionRuleEditor({
  condition,
  references,
  onChange,
  onDelete,
}: {
  condition: ConditionRule;
  references: ReturnType<typeof getNodeReferenceOptions>;
  onChange: (condition: ConditionRule) => void;
  onDelete: () => void;
}) {
  const selectedReference = references.find(
    (reference) => reference.id === condition.source.nodeId,
  );

  return (
    <div className="rule-card">
      <div className="field-grid">
        <div className="field">
          <label className="field-label">Source</label>
          <select
            className="input"
            value={condition.source.nodeId}
            onChange={(event) =>
              onChange({
                ...condition,
                source: {
                  nodeId: event.target.value,
                  path: [],
                },
              })
            }
          >
            <option value="">Select node</option>
            {references.map((reference) => (
              <option key={reference.id} value={reference.id}>
                {reference.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Path</label>
          <input
            className="input"
            placeholder={
              selectedReference?.fields.join(", ") || "field.subfield"
            }
            value={condition.source.path.join(".")}
            onChange={(event) =>
              onChange({
                ...condition,
                source: {
                  ...condition.source,
                  path: event.target.value
                    .split(".")
                    .map((part) => part.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field-label">Operator</label>
          <select
            className="input"
            value={condition.operator}
            onChange={(event) =>
              onChange({
                ...condition,
                operator: event.target.value as ConditionRule["operator"],
              })
            }
          >
            {CONDITION_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {operator}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Value</label>
          <input
            className="input"
            value={condition.value === undefined ? "" : String(condition.value)}
            onChange={(event) =>
              onChange({
                ...condition,
                value: event.target.value,
              })
            }
          />
        </div>
      </div>

      <button className="button button-subtle" type="button" onClick={onDelete}>
        Remove Condition
      </button>
    </div>
  );
}

function TemplateNodeEditor({
  node,
  references,
  onChange,
}: {
  node: Extract<WorkflowNodeData, { kind: NodeKind.Template }>;
  references: ReturnType<typeof getNodeReferenceOptions>;
  onChange: (node: Extract<WorkflowNodeData, { kind: NodeKind.Template }>) => void;
}) {
  return (
    <div className="stack stack-tight">
      <div className="section-label">Template Text</div>
      <textarea
        className="editor"
        value={richTextToEditorText(node.template.tiptap)}
        onChange={(event) =>
          onChange({
            ...node,
            template: {
              type: "tiptap",
              tiptap: plainTextToRichText(event.target.value),
            },
          })
        }
      />
      <VariableRefPicker references={references} />
    </div>
  );
}

function LlmNodeEditor({
  node,
  references,
  onChange,
}: {
  node: LLMNodeData;
  references: ReturnType<typeof getNodeReferenceOptions>;
  onChange: (node: LLMNodeData) => void;
}) {
  return (
    <div className="stack stack-tight">
      <div className="section-label">Model</div>
      <div className="field-grid">
        <div className="field">
          <label className="field-label">Provider</label>
          <input
            className="input"
            value={node.model?.provider ?? ""}
            onChange={(event) =>
              onChange({
                ...node,
                model: {
                  ...node.model,
                  id: node.model?.id ?? "",
                  name: node.model?.name ?? "",
                  provider: event.target.value,
                },
              })
            }
          />
        </div>
        <div className="field">
          <label className="field-label">Model Id</label>
          <input
            className="input"
            value={node.model?.id ?? ""}
            onChange={(event) =>
              onChange({
                ...node,
                model: {
                  ...node.model,
                  id: event.target.value,
                  name: node.model?.name ?? event.target.value,
                  provider: node.model?.provider ?? "",
                },
              })
            }
          />
        </div>
      </div>

      <div className="section-label">Messages</div>
      {node.messages.map((message, index) => (
        <div className="mapping-card" key={`${message.role}-${index}`}>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Role</label>
              <select
                className="input"
                value={message.role}
                onChange={(event) =>
                  onChange({
                    ...node,
                    messages: node.messages.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            role: event.target.value as LLMNodeData["messages"][number]["role"],
                          }
                        : item,
                    ),
                  })
                }
              >
                <option value="system">system</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </div>

            <button
              className="button button-subtle align-end"
              type="button"
              onClick={() =>
                onChange({
                  ...node,
                  messages: node.messages.filter((_, itemIndex) => itemIndex !== index),
                })
              }
            >
              Remove
            </button>
          </div>

          <textarea
            className="editor small"
            value={richTextToEditorText(message.content)}
            onChange={(event) =>
              onChange({
                ...node,
                messages: node.messages.map((item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        content: plainTextToRichText(event.target.value),
                      }
                    : item,
                ),
              })
            }
          />
        </div>
      ))}

      <button
        className="button button-primary"
        type="button"
        onClick={() =>
          onChange({
            ...node,
            messages: [
              ...node.messages,
              {
                role: "user",
                content: plainTextToRichText("New message"),
              },
            ],
          })
        }
      >
        Add Message
      </button>

      <VariableRefPicker references={references} />

      <div className="field">
        <label className="field-label">Answer Type</label>
        <select
          className="input"
          value={node.outputSchema.properties.answer?.type ?? "string"}
          onChange={(event) =>
            onChange({
              ...node,
              outputSchema: {
                ...node.outputSchema,
                properties: {
                  ...node.outputSchema.properties,
                  answer: {
                    type: event.target.value as JsonSchema["type"],
                  },
                },
              },
            })
          }
        >
          <option value="string">string</option>
          <option value="object">object</option>
        </select>
      </div>
    </div>
  );
}

function ToolNodeEditor({
  node,
  references,
  onChange,
}: {
  node: ToolNodeData;
  references: ReturnType<typeof getNodeReferenceOptions>;
  onChange: (node: ToolNodeData) => void;
}) {
  const mcpTool = node.tool?.type === "mcp-tool" ? node.tool : undefined;

  return (
    <div className="stack stack-tight">
      <div className="section-label">Tool Config</div>
      <div className="field-grid">
        <div className="field">
          <label className="field-label">Tool Type</label>
          <select
            className="input"
            value={node.tool?.type ?? "app-tool"}
            onChange={(event) =>
              onChange({
                ...node,
                tool:
                  event.target.value === "mcp-tool"
                    ? {
                        id: node.tool?.id ?? "",
                        description: node.tool?.description ?? "",
                        type: "mcp-tool",
                        serverId:
                          node.tool?.type === "mcp-tool" ? node.tool.serverId : "",
                        serverName:
                          node.tool?.type === "mcp-tool" ? node.tool.serverName : "",
                      }
                    : {
                        id: node.tool?.id ?? "",
                        description: node.tool?.description ?? "",
                        type: "app-tool",
                      },
              })
            }
          >
            <option value="app-tool">app-tool</option>
            <option value="mcp-tool">mcp-tool</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label">Tool Id</label>
          <input
            className="input"
            value={node.tool?.id ?? ""}
            onChange={(event) =>
              onChange({
                ...node,
                tool: node.tool
                  ? {
                      ...node.tool,
                      id: event.target.value,
                    }
                  : {
                      id: event.target.value,
                      description: "",
                      type: "app-tool",
                    },
              })
            }
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Tool Description</label>
        <textarea
          className="editor small"
          value={node.tool?.description ?? ""}
          onChange={(event) =>
            onChange({
              ...node,
              tool: node.tool
                ? {
                    ...node.tool,
                    description: event.target.value,
                  }
                : {
                    id: "",
                    description: event.target.value,
                    type: "app-tool",
                  },
            })
          }
        />
      </div>

      {mcpTool && (
        <div className="field-grid">
          <div className="field">
            <label className="field-label">Server Id</label>
            <input
              className="input"
              value={mcpTool.serverId}
              onChange={(event) =>
                onChange({
                  ...node,
                  tool: {
                    ...mcpTool,
                    serverId: event.target.value,
                  },
                })
              }
            />
          </div>
          <div className="field">
            <label className="field-label">Server Name</label>
            <input
              className="input"
              value={mcpTool.serverName}
              onChange={(event) =>
                onChange({
                  ...node,
                  tool: {
                    ...mcpTool,
                    serverName: event.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      )}

      <div className="field-grid">
        <div className="field">
          <label className="field-label">Model Provider</label>
          <input
            className="input"
            value={node.model?.provider ?? ""}
            onChange={(event) =>
              onChange({
                ...node,
                model: {
                  id: node.model?.id ?? "",
                  name: node.model?.name ?? "",
                  provider: event.target.value,
                },
              })
            }
          />
        </div>
        <div className="field">
          <label className="field-label">Model Id</label>
          <input
            className="input"
            value={node.model?.id ?? ""}
            onChange={(event) =>
              onChange({
                ...node,
                model: {
                  id: event.target.value,
                  name: node.model?.name ?? event.target.value,
                  provider: node.model?.provider ?? "",
                },
              })
            }
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Tool Message</label>
        <textarea
          className="editor small"
          value={richTextToEditorText(node.message)}
          onChange={(event) =>
            onChange({
              ...node,
              message: plainTextToRichText(event.target.value),
            })
          }
        />
      </div>

      <VariableRefPicker references={references} />
    </div>
  );
}

function HttpNodeEditor({
  node,
  onChange,
}: {
  node: HttpNodeData;
  onChange: (node: HttpNodeData) => void;
}) {
  function updateCollection(
    key: "headers" | "query",
    index: number,
    field: "key" | "value",
    value: string,
  ) {
    onChange({
      ...node,
      [key]: node[key].map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    });
  }

  return (
    <div className="stack stack-tight">
      <div className="field-grid">
        <div className="field">
          <label className="field-label">Method</label>
          <select
            className="input"
            value={node.method}
            onChange={(event) =>
              onChange({
                ...node,
                method: event.target.value as HttpNodeData["method"],
              })
            }
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label">Timeout (ms)</label>
          <input
            className="input"
            type="number"
            value={node.timeout ?? 30000}
            onChange={(event) =>
              onChange({
                ...node,
                timeout: Number(event.target.value),
              })
            }
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">URL</label>
        <input
          className="input"
          value={typeof node.url === "string" ? node.url : ""}
          onChange={(event) =>
            onChange({
              ...node,
              url: event.target.value,
            })
          }
        />
      </div>

      <div className="field">
        <label className="field-label">Body</label>
        <textarea
          className="editor small"
          value={typeof node.body === "string" ? node.body : ""}
          onChange={(event) =>
            onChange({
              ...node,
              body: event.target.value,
            })
          }
        />
      </div>

      <CollectionEditor
        label="Headers"
        items={node.headers}
        onAdd={() =>
          onChange({
            ...node,
            headers: [...node.headers, { key: "", value: "" }],
          })
        }
        onChange={(index, field, value) => updateCollection("headers", index, field, value)}
        onDelete={(index) =>
          onChange({
            ...node,
            headers: node.headers.filter((_, itemIndex) => itemIndex !== index),
          })
        }
      />

      <CollectionEditor
        label="Query Params"
        items={node.query}
        onAdd={() =>
          onChange({
            ...node,
            query: [...node.query, { key: "", value: "" }],
          })
        }
        onChange={(index, field, value) => updateCollection("query", index, field, value)}
        onDelete={(index) =>
          onChange({
            ...node,
            query: node.query.filter((_, itemIndex) => itemIndex !== index),
          })
        }
      />
    </div>
  );
}

function CollectionEditor({
  label,
  items,
  onAdd,
  onChange,
  onDelete,
}: {
  label: string;
  items: Array<{ key: string; value?: string | { nodeId: string; path: string[] } }>;
  onAdd: () => void;
  onChange: (index: number, field: "key" | "value", value: string) => void;
  onDelete: (index: number) => void;
}) {
  return (
    <div className="stack stack-tight">
      <div className="panel-header compact">
        <div className="section-label">{label}</div>
        <button className="button button-subtle" type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      {items.map((item, index) => (
        <div className="field-grid compact" key={`${label}-${index}`}>
          <input
            className="input"
            placeholder="key"
            value={item.key}
            onChange={(event) => onChange(index, "key", event.target.value)}
          />
          <input
            className="input"
            placeholder="value"
            value={collectionValueToText(item.value)}
            onChange={(event) => onChange(index, "value", event.target.value)}
          />
          <button
            className="button button-subtle"
            type="button"
            onClick={() => onDelete(index)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function SchemaFieldsEditor({
  fields,
  onChange,
}: {
  fields: Array<{
    key: string;
    type: JsonSchema["type"];
    description?: string;
    defaultValue?: string;
    required?: boolean;
  }>;
  onChange: (
    fields: Array<{
      key: string;
      type: JsonSchema["type"];
      description?: string;
      defaultValue?: string;
      required?: boolean;
    }>,
  ) => void;
}) {
  const rows = fields.length ? fields : [createSchemaField()];

  return (
    <div className="stack stack-tight">
      {rows.map((field, index) => (
        <div className="mapping-card" key={`${field.key}-${index}`}>
          <div className="field-grid">
            <div className="field">
              <label className="field-label">Field Key</label>
              <input
                className="input"
                value={field.key}
                onChange={(event) =>
                  onChange(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            key: event.target.value,
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <div className="field">
              <label className="field-label">Type</label>
              <select
                className="input"
                value={field.type ?? "string"}
                onChange={(event) =>
                  onChange(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            type: event.target.value as JsonSchema["type"],
                          }
                        : item,
                    ),
                  )
                }
              >
                {getFieldTypeOptions().map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-grid">
            <div className="field">
              <label className="field-label">Default</label>
              <input
                className="input"
                value={field.defaultValue ?? ""}
                onChange={(event) =>
                  onChange(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            defaultValue: event.target.value,
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>

            <div className="field checkbox-field">
              <label className="field-label">Required</label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) =>
                    onChange(
                      rows.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              required: event.target.checked,
                            }
                          : item,
                      ),
                    )
                  }
                />
                <span>{field.required ? "Yes" : "No"}</span>
              </label>
            </div>
          </div>

          <div className="field">
            <label className="field-label">Description</label>
            <textarea
              className="editor small"
              value={field.description ?? ""}
              onChange={(event) =>
                onChange(
                  rows.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          description: event.target.value,
                        }
                      : item,
                  ),
                )
              }
            />
          </div>

          <button
            className="button button-subtle"
            type="button"
            onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove Field
          </button>
        </div>
      ))}

      <button
        className="button button-primary"
        type="button"
        onClick={() => onChange([...rows, createSchemaField()])}
      >
        Add Field
      </button>
    </div>
  );
}

function collectionValueToText(
  value: string | { nodeId: string; path: string[] } | undefined,
) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return `{{${value.nodeId}${value.path.length ? `.${value.path.join(".")}` : ""}}}`;
}

function VariableRefPicker({
  references,
}: {
  references: ReturnType<typeof getNodeReferenceOptions>;
}) {
  const [expanded, setExpanded] = useState(false);

  if (references.length === 0) {
    return null;
  }

  function handleCopy(ref: string) {
    navigator.clipboard.writeText(ref);
  }

  return (
    <div className="mapping-card" style={{ padding: 10 }}>
      <button
        className="button button-subtle"
        type="button"
        style={{ padding: "6px 10px", fontSize: "0.82rem" }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide" : "Show"} Variable References ({references.length})
      </button>
      {expanded && (
        <div className="stack stack-tight" style={{ marginTop: 8 }}>
          {references.map((ref) => (
            <div
              key={ref.id}
              style={{
                display: "grid",
                gap: 4,
                padding: "8px 10px",
                borderRadius: 10,
                background: "rgba(20, 33, 61, 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.88rem" }}>
                  {ref.name}
                  <span className="muted" style={{ fontWeight: 400, marginLeft: 6, fontSize: "0.78rem" }}>
                    ({ref.kind})
                  </span>
                </strong>
              </div>
              {ref.fields.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ref.fields.map((field) => {
                    const refText = `{{${ref.id}.${field}}}`;
                    return (
                      <button
                        key={field}
                        type="button"
                        className="chip"
                        style={{ cursor: "pointer", fontSize: "0.78rem", padding: "4px 8px" }}
                        onClick={() => handleCopy(refText)}
                        title={`Click to copy: ${refText}`}
                      >
                        {field}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div className="muted" style={{ fontSize: "0.78rem" }}>
            Click a field chip to copy its <code>{`{{nodeId.field}}`}</code> reference.
          </div>
        </div>
      )}
    </div>
  );
}
