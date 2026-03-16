"use client";

import { useEffect, useMemo, useState } from "react";
import { createWorkflowAgent } from "@/src/core/executor";
import type {
  WorkflowExecutionResult,
  WorkflowNodeHistory,
  WorkflowRuntimeEvent,
} from "@/src/core/types";
import { useWorkflow } from "@/src/use-workflow";
import { useWorkflowContext } from "@/src/workflow-provider";
import {
  createSupportWorkflow,
  supportWorkflowExampleInput,
} from "@/src/examples/support-workflow";
import { WorkflowEditor } from "@/src/features/editor/workflow-editor";

export function WorkflowStudio() {
  const workflow = useWorkflow();
  const { adapters, setRuntime } = useWorkflowContext();
  const [flowText, setFlowText] = useState(workflow.toJSON());
  const [flowDraftDirty, setFlowDraftDirty] = useState(false);
  const [inputText, setInputText] = useState(
    JSON.stringify(supportWorkflowExampleInput, null, 2),
  );
  const [notice, setNotice] = useState<string>(
    "Designer ready. Visual edits persist into the package-style workflow JSON.",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeResult, setRuntimeResult] = useState<WorkflowExecutionResult>();
  const [runtimeHistories, setRuntimeHistories] = useState<WorkflowNodeHistory[]>([]);
  const [runtimeEvents, setRuntimeEvents] = useState<WorkflowRuntimeEvent[]>([]);
  const [runtimeNodeStatuses, setRuntimeNodeStatuses] = useState<
    Record<string, "fail" | "running" | "success" | undefined>
  >({});

  const validation = useMemo(() => workflow.validate(), [workflow.flow, workflow]);

  useEffect(() => {
    if (!flowDraftDirty) {
      setFlowText(workflow.toJSON());
    }
  }, [flowDraftDirty, workflow.flow, workflow]);

  function resetRuntime(message?: string) {
    setRuntimeNodeStatuses({});
    setRuntimeHistories([]);
    setRuntimeEvents([]);
    setRuntimeResult(undefined);
    setIsRunning(false);
    workflow.clearRuntime();
    if (message) {
      setNotice(message);
    }
  }

  async function handleRun() {
    if (!validation.valid) {
      setNotice(
        validation.errors.map((error) => error.message).join(" | ") ||
          "Workflow is invalid.",
      );
      return;
    }

    let parsedInput: Record<string, unknown>;
    try {
      parsedInput = JSON.parse(inputText) as Record<string, unknown>;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invalid execution input");
      return;
    }

    setIsRunning(true);
    setRuntime({
      status: "running",
    });
    setRuntimeNodeStatuses({});
    setRuntimeHistories([]);
    setRuntimeEvents([]);
    setRuntimeResult(undefined);
    setNotice("Workflow execution started.");

    const agent = createWorkflowAgent({
      workflow: workflow.getFlow(),
      adapters,
    });

    const unsubscribe = agent.subscribe((event) => {
      setRuntimeEvents((current) => [...current, event]);

      if (event.eventType === "NODE_START" && event.node.kind !== "skip") {
        setRuntimeNodeStatuses((current) => ({
          ...current,
          [event.node.id]: "running",
        }));
        setRuntimeHistories((current) => [
          ...current,
          {
            id: `${event.node.id}-${event.startedAt}`,
            nodeId: event.node.id,
            name: event.node.name,
            kind: event.node.kind,
            startedAt: event.startedAt,
            status: "running",
          },
        ]);
        return;
      }

      if (event.eventType === "NODE_END" && event.node.kind !== "skip") {
        const nextStatus = event.isOk ? "success" : "fail";
        setRuntimeNodeStatuses((current) => ({
          ...current,
          [event.node.id]: nextStatus,
        }));
        setRuntimeHistories((current) =>
          current.map((history) =>
            history.id === `${event.node.id}-${event.startedAt}`
              ? {
                  ...history,
                  endedAt: event.endedAt,
                  status: nextStatus,
                  error: event.error,
                  result: {
                    output: event.output,
                  },
                }
              : history,
          ),
        );
      }
    });

    try {
      const result = await agent.run(parsedInput);
      unsubscribe();
      setRuntimeResult(result);
      setRuntimeHistories(result.histories);
      setRuntimeEvents(result.events);
      setRuntime({
        status: result.isOk ? "success" : "error",
        lastResult: result,
      });
      setNotice(
        result.isOk
          ? "Workflow executed successfully and produced an agent payload."
          : result.error ?? "Workflow execution failed.",
      );
    } catch (error) {
      unsubscribe();
      setRuntime({
        status: "error",
      });
      setNotice(error instanceof Error ? error.message : "Workflow execution failed.");
    } finally {
      setIsRunning(false);
    }
  }

  function handleApplyJson() {
    try {
      workflow.replaceFlow(JSON.parse(flowText));
      setFlowDraftDirty(false);
      resetRuntime("Workflow JSON applied to the designer.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Invalid workflow JSON");
    }
  }

  function handleRestoreExample() {
    workflow.replaceFlow(createSupportWorkflow());
    setInputText(JSON.stringify(supportWorkflowExampleInput, null, 2));
    setFlowDraftDirty(false);
    resetRuntime("Reference example restored.");
  }

  return (
    <div className="stack">
      <WorkflowEditor
        inputText={inputText}
        isRunning={isRunning}
        notice={notice}
        runtimeResult={runtimeResult}
        runtimeHistories={runtimeHistories}
        runtimeNodeStatuses={runtimeNodeStatuses}
        onInputTextChange={setInputText}
        onRun={handleRun}
        onClearRuntime={() => resetRuntime("Runtime state cleared.")}
        onNotice={setNotice}
      />

      <div className="workflow-bottom-grid">
        <section className="panel">
          <div className="panel-inner">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Workflow JSON Debug</h2>
                <p className="panel-copy">
                  The visual designer writes to the same host-neutral workflow
                  serialization that downstream apps will read to instantiate
                  agents.
                </p>
              </div>
              <span className={`pill ${flowDraftDirty ? "error-soft" : ""}`}>
                {flowDraftDirty ? "draft differs" : "synced"}
              </span>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="workflow-json">
                Workflow Definition
              </label>
              <textarea
                id="workflow-json"
                className="editor"
                value={flowText}
                onChange={(event) => {
                  setFlowText(event.target.value);
                  setFlowDraftDirty(true);
                }}
              />
            </div>

            <div className="toolbar">
              <button className="button button-primary" type="button" onClick={handleApplyJson}>
                Apply JSON
              </button>
              <button
                className="button button-subtle"
                type="button"
                onClick={() => {
                  setFlowText(workflow.toJSON());
                  setFlowDraftDirty(false);
                  setNotice("JSON editor reset to current designer state.");
                }}
              >
                Reset Draft
              </button>
              <button
                className="button button-subtle"
                type="button"
                onClick={handleRestoreExample}
              >
                Restore Example
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-inner stack stack-tight">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Agent Contract</h2>
                <p className="panel-copy">
                  This host app edits and executes a portable workflow JSON
                  contract intended for other apps to read and turn into agents.
                </p>
              </div>
              <span className="pill">{workflow.runtime.status}</span>
            </div>

            <div className="stats">
              <div className="stat-card">
                <p className="stat-label">Nodes</p>
                <p className="stat-value">{workflow.flow.nodes.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Edges</p>
                <p className="stat-value">{workflow.flow.edges.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Events</p>
                <p className="stat-value">{runtimeEvents.length}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Validation</p>
                <p className="stat-value">
                  {validation.valid ? "Valid" : `${validation.errors.length} issues`}
                </p>
              </div>
            </div>

            <div className="notice">
              {runtimeResult
                ? JSON.stringify(
                    {
                      isOk: runtimeResult.isOk,
                      output: runtimeResult.output,
                    },
                    null,
                    2,
                  )
                : "Run the workflow to inspect the final agent payload."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
