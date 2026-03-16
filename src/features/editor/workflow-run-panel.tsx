"use client";

import { useCallback, useMemo, useState } from "react";
import {
  NodeKind,
  type InputNodeData,
  type ObjectJsonSchema,
  type WorkflowExecutionResult,
  type WorkflowNodeHistory,
  type WorkflowValidationResult,
} from "@/src/core/types";
import { useWorkflow } from "@/src/use-workflow";

type WorkflowRunPanelProps = {
  inputText: string;
  isRunning: boolean;
  notice?: string;
  result?: WorkflowExecutionResult;
  validation: WorkflowValidationResult;
  histories: WorkflowNodeHistory[];
  onInputTextChange: (value: string) => void;
  onRun: () => void;
  onClearRuntime: () => void;
};

export function WorkflowRunPanel({
  inputText,
  isRunning,
  notice,
  result,
  validation,
  histories,
  onInputTextChange,
  onRun,
  onClearRuntime,
}: WorkflowRunPanelProps) {
  const workflow = useWorkflow();
  const [tab, setTab] = useState<"input" | "result">("input");
  const [inputMode, setInputMode] = useState<"form" | "json">("form");
  const [selectedHistory, setSelectedHistory] = useState<WorkflowNodeHistory | null>(null);

  const inputNode = useMemo(
    () => workflow.flow.nodes.find((node) => node.data.kind === NodeKind.Input),
    [workflow.flow.nodes],
  );

  const inputSchema = useMemo<ObjectJsonSchema>(() => {
    if (!inputNode) {
      return { type: "object", properties: {} };
    }
    return (inputNode.data as InputNodeData).outputSchema;
  }, [inputNode]);

  const schemaFields = useMemo(() => {
    const required = new Set(inputSchema.required ?? []);
    return Object.entries(inputSchema.properties ?? {}).map(([key, field]) => ({
      key,
      type: field.type ?? "string",
      description: field.description,
      defaultValue: field.default,
      required: required.has(key),
      enumValues: field.enum,
    }));
  }, [inputSchema]);

  const parsedFormValues = useMemo<Record<string, unknown>>(() => {
    try {
      return JSON.parse(inputText) as Record<string, unknown>;
    } catch {
      return {};
    }
  }, [inputText]);

  const updateFormField = useCallback(
    (key: string, value: unknown) => {
      const current = { ...parsedFormValues };
      current[key] = value;
      onInputTextChange(JSON.stringify(current, null, 2));
    },
    [parsedFormValues, onInputTextChange],
  );

  const outputText = useMemo(() => {
    if (!result) {
      return "// Run the workflow to inspect output";
    }
    return JSON.stringify(
      {
        isOk: result.isOk,
        output: result.output,
        error: result.error,
      },
      null,
      2,
    );
  }, [result]);

  function handleCopyOutput() {
    navigator.clipboard.writeText(outputText);
  }

  return (
    <div className="workflow-side-shell">
      <div className="workflow-side-header">
        <div>
          <h3 className="panel-title">Run Workflow</h3>
          <p className="panel-copy">
            Execute the current graph and inspect node histories plus final
            output.
          </p>
        </div>
        <span className={`pill ${isRunning ? "ok-soft" : ""}`}>
          {isRunning ? "running" : result?.isOk ? "ready" : "idle"}
        </span>
      </div>

      <div className="workflow-subtabs">
        <button
          className={`workflow-subtab ${tab === "input" ? "is-active" : ""}`}
          type="button"
          onClick={() => setTab("input")}
        >
          Input
        </button>
        <button
          className={`workflow-subtab ${tab === "result" ? "is-active" : ""}`}
          type="button"
          onClick={() => setTab("result")}
        >
          Result
        </button>
      </div>

      {notice && <div className="workflow-inline-notice">{notice}</div>}

      {tab === "input" ? (
        <div className="stack stack-tight">
          {schemaFields.length > 0 && (
            <div className="workflow-subtabs">
              <button
                className={`workflow-subtab ${inputMode === "form" ? "is-active" : ""}`}
                type="button"
                onClick={() => setInputMode("form")}
              >
                Form
              </button>
              <button
                className={`workflow-subtab ${inputMode === "json" ? "is-active" : ""}`}
                type="button"
                onClick={() => setInputMode("json")}
              >
                JSON
              </button>
            </div>
          )}

          {inputMode === "form" && schemaFields.length > 0 ? (
            <div className="stack stack-tight">
              {schemaFields.map((field) => (
                <div className="field" key={field.key}>
                  <label className="field-label" htmlFor={`input-${field.key}`}>
                    {field.key}
                    {field.required && (
                      <span style={{ color: "var(--error)", marginLeft: 4 }}>
                        *
                      </span>
                    )}
                  </label>
                  {field.description && (
                    <span className="muted" style={{ fontSize: "0.82rem" }}>
                      {field.description}
                    </span>
                  )}
                  {field.enumValues ? (
                    <select
                      id={`input-${field.key}`}
                      className="input"
                      value={String(parsedFormValues[field.key] ?? "")}
                      onChange={(event) =>
                        updateFormField(field.key, event.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {field.enumValues.map((option) => (
                        <option key={String(option)} value={String(option)}>
                          {String(option)}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "boolean" ? (
                    <label className="toggle-row">
                      <input
                        id={`input-${field.key}`}
                        type="checkbox"
                        checked={Boolean(parsedFormValues[field.key])}
                        onChange={(event) =>
                          updateFormField(field.key, event.target.checked)
                        }
                      />
                      <span>
                        {parsedFormValues[field.key] ? "true" : "false"}
                      </span>
                    </label>
                  ) : field.type === "number" || field.type === "integer" ? (
                    <input
                      id={`input-${field.key}`}
                      className="input"
                      type="number"
                      value={
                        parsedFormValues[field.key] !== undefined
                          ? Number(parsedFormValues[field.key])
                          : ""
                      }
                      onChange={(event) =>
                        updateFormField(
                          field.key,
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                        )
                      }
                    />
                  ) : (
                    <textarea
                      id={`input-${field.key}`}
                      className="editor small"
                      style={{ minHeight: 80 }}
                      value={String(parsedFormValues[field.key] ?? "")}
                      onChange={(event) =>
                        updateFormField(field.key, event.target.value)
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="field">
              <label className="field-label" htmlFor="runtime-json">
                Runtime Input JSON
              </label>
              <textarea
                id="runtime-json"
                className="editor"
                value={inputText}
                onChange={(event) => onInputTextChange(event.target.value)}
              />
            </div>
          )}

          <div className="toolbar">
            <button
              className="button button-primary"
              type="button"
              onClick={onRun}
              disabled={isRunning}
            >
              {isRunning ? "Running..." : "Run Workflow"}
            </button>
            <button
              className="button button-subtle"
              type="button"
              onClick={onClearRuntime}
            >
              Clear Runtime
            </button>
          </div>

          {!validation.valid && (
            <div className="validation-card">
              <strong>Validation blocked</strong>
              {validation.errors.map((error, index) => (
                <div
                  className="validation-row"
                  key={`${error.nodeId ?? "flow"}-${index}`}
                >
                  {error.nodeId ? `${error.nodeId}: ` : ""}
                  {error.message}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="stack stack-tight">
          {/* Output section */}
          <div className="field">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label className="field-label" htmlFor="result-json">
                Execution Output
              </label>
              {result && (
                <button
                  className="button button-subtle"
                  type="button"
                  style={{ padding: "4px 10px", fontSize: "0.82rem" }}
                  onClick={handleCopyOutput}
                >
                  Copy
                </button>
              )}
            </div>
            <textarea
              id="result-json"
              className="editor"
              readOnly
              value={outputText}
            />
          </div>

          {/* Runtime history */}
          <div className="workflow-history">
            <div className="section-label">Runtime History</div>
            {histories.length === 0 ? (
              <div className="workflow-empty-state">No node history yet.</div>
            ) : (
              histories.map((history) => (
                <button
                  className="history-row"
                  key={history.id}
                  type="button"
                  style={{
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onClick={() =>
                    setSelectedHistory(
                      selectedHistory?.id === history.id ? null : history,
                    )
                  }
                >
                  <div>
                    <strong>{history.name}</strong>
                    <div className="muted">
                      {history.kind}
                      {history.endedAt
                        ? ` \u2022 ${history.endedAt - history.startedAt} ms`
                        : ""}
                    </div>
                  </div>
                  <span
                    className={`history-status history-status--${history.status}`}
                  >
                    {history.status}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Node result detail popup */}
          {selectedHistory && (
            <NodeResultDetail
              history={selectedHistory}
              onClose={() => setSelectedHistory(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function NodeResultDetail({
  history,
  onClose,
}: {
  history: WorkflowNodeHistory;
  onClose: () => void;
}) {
  const [detailTab, setDetailTab] = useState<"input" | "output">("output");

  const duration = history.endedAt
    ? ((history.endedAt - history.startedAt) / 1000).toFixed(2)
    : "...";

  function handleCopy() {
    const data =
      detailTab === "input" ? history.result?.input : history.result?.output;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }

  return (
    <div className="mapping-card">
      <div className="panel-header compact">
        <div>
          <strong>{history.name}</strong>
          <div className="muted" style={{ marginTop: 4 }}>
            {history.kind} &middot; {duration}s
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className={`history-status history-status--${history.status}`}>
            {history.status}
          </span>
          <button
            className="button button-subtle"
            type="button"
            style={{ padding: "4px 10px" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {history.error && (
        <div className="validation-card">
          <strong>Error</strong>
          <div className="validation-row">{history.error}</div>
        </div>
      )}

      <div className="workflow-subtabs">
        <button
          className={`workflow-subtab ${detailTab === "input" ? "is-active" : ""}`}
          type="button"
          onClick={() => setDetailTab("input")}
        >
          Input
        </button>
        <button
          className={`workflow-subtab ${detailTab === "output" ? "is-active" : ""}`}
          type="button"
          onClick={() => setDetailTab("output")}
        >
          Output
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="button button-subtle"
          type="button"
          style={{ padding: "4px 10px", fontSize: "0.82rem" }}
          onClick={handleCopy}
        >
          Copy JSON
        </button>
      </div>

      <textarea
        className="editor small"
        readOnly
        value={JSON.stringify(
          detailTab === "input" ? history.result?.input : history.result?.output,
          null,
          2,
        )}
      />
    </div>
  );
}
