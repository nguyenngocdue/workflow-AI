"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { WorkflowProvider } from "@/src/workflow-provider";
import { WorkflowStudio } from "@/src/features/workflow-studio";
import { type WorkflowData } from "@/src/core/types";
import {
  deleteWorkflow,
  duplicateWorkflow,
  formatWorkflowDate,
  getWorkflowRecord,
  updateWorkflowRecord,
  type WorkflowRecord,
} from "@/src/infrastructure/workflow-library";
import { EditWorkflowDialog } from "@/src/features/editor/edit-workflow-dialog";

export function WorkflowDesignerPage({
  workflowId,
}: {
  workflowId: string;
}) {
  const router = useRouter();
  const [record, setRecord] = useState<WorkflowRecord | null>();
  const [initialFlow, setInitialFlow] = useState<WorkflowData | null>(null);
  const [saveStatus, setSaveStatus] = useState("Loading workflow...");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const nextRecord = getWorkflowRecord(workflowId) ?? null;
    setRecord(nextRecord);
    setInitialFlow(nextRecord?.flow ?? null);
    setSaveStatus(nextRecord ? `Loaded ${nextRecord.name}` : "Workflow not found");
  }, [workflowId]);

  const summary = useMemo(() => {
    if (!record) {
      return null;
    }
    return {
      nodeCount: record.flow.nodes.length,
      edgeCount: record.flow.edges.length,
      updatedAt: formatWorkflowDate(record.updatedAt),
    };
  }, [record]);

  function patchRecord(patch: Partial<Omit<WorkflowRecord, "id" | "createdAt">>) {
    const next = updateWorkflowRecord(workflowId, patch);
    if (!next) {
      return;
    }
    setRecord(next);
    setSaveStatus(`Saved ${formatWorkflowDate(next.updatedAt)}`);
  }

  function handleDelete() {
    startTransition(() => {
      deleteWorkflow(workflowId);
      router.push("/dashboard");
    });
  }

  function handleDuplicate() {
    startTransition(() => {
      const copy = duplicateWorkflow(workflowId);
      if (!copy) {
        return;
      }
      router.push(`/workflows/${copy.id}`);
    });
  }

  if (record === undefined) {
    return (
      <main className="workflow-shell">
        <section className="panel">
          <div className="panel-inner">Loading workflow...</div>
        </section>
      </main>
    );
  }

  if (!record || !initialFlow) {
    return (
      <main className="workflow-shell">
        <section className="panel">
          <div className="panel-inner stack">
            <div>
              <h1 className="panel-title">Workflow Not Found</h1>
              <p className="panel-copy">
                Workflow này không tồn tại trong local library hiện tại.
              </p>
            </div>
            <Link className="button button-primary" href="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="workflow-shell">
      <section className="designer-hero">
        <div className="designer-hero-copy">
          <span className="hero-badge">workflow designer</span>
          <h1>
            {record.icon && <span style={{ marginRight: 10 }}>{record.icon}</span>}
            {record.name}
            <button
              className="button button-subtle"
              type="button"
              style={{ marginLeft: 12, padding: "4px 10px", fontSize: "0.78rem", verticalAlign: "middle" }}
              onClick={() => setEditDialogOpen(true)}
            >
              Edit
            </button>
          </h1>
          <p>
            Trang thiết kế workflow riêng theo từng record, tách khỏi dashboard
            giống mô hình app quản lý workflow thực tế.
          </p>
        </div>

        <div className="designer-hero-actions">
          <Link className="button button-subtle" href="/dashboard">
            Back to Dashboard
          </Link>
          <button
            className={`button ${record.isPublished ? "button-subtle" : "button-primary"}`}
            type="button"
            onClick={() =>
              patchRecord({ isPublished: !record.isPublished })
            }
          >
            {record.isPublished ? "Unpublish" : "Publish"}
          </button>
          <button className="button button-subtle" type="button" onClick={handleDuplicate}>
            Duplicate
          </button>
          <button className="button button-subtle" type="button" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-inner">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Workflow Meta</h2>
              <p className="panel-copy">
                Metadata ở đây thuộc app layer, còn graph/executor vẫn nằm trong package core.
              </p>
            </div>
            <span className="pill">{saveStatus}</span>
          </div>

          <div className="designer-meta-grid">
            <div className="field">
              <label className="field-label" htmlFor="workflow-name">
                Workflow Name
              </label>
              <input
                id="workflow-name"
                className="input"
                value={record.name}
                maxLength={20}
                onChange={(event) => patchRecord({ name: event.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="workflow-visibility">
                Visibility
              </label>
              <select
                id="workflow-visibility"
                className="input"
                value={record.visibility}
                onChange={(event) =>
                  patchRecord({
                    visibility: event.target.value as WorkflowRecord["visibility"],
                  })
                }
              >
                <option value="private">private</option>
                <option value="public">public</option>
                <option value="readonly">readonly</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="workflow-icon">
                Icon (emoji)
              </label>
              <input
                id="workflow-icon"
                className="input"
                value={record.icon ?? ""}
                placeholder="e.g. \u{1F680}"
                maxLength={4}
                onChange={(event) => patchRecord({ icon: event.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="workflow-icon-color">
                Icon Color
              </label>
              <input
                id="workflow-icon-color"
                className="input"
                type="color"
                value={record.iconColor ?? "#dd6b20"}
                onChange={(event) => patchRecord({ iconColor: event.target.value })}
              />
            </div>

            <div className="field designer-meta-full">
              <label className="field-label" htmlFor="workflow-description">
                Description
              </label>
              <textarea
                id="workflow-description"
                className="editor small"
                value={record.description}
                maxLength={200}
                onChange={(event) => patchRecord({ description: event.target.value })}
              />
            </div>
          </div>

          {summary && (
            <div className="chip-row">
              <span className={`pill ${record.isPublished ? "ok-soft" : ""}`}>
                {record.isPublished ? "Published" : "Draft"}
              </span>
              <span className="chip">{summary.nodeCount} nodes</span>
              <span className="chip">{summary.edgeCount} edges</span>
              <span className="chip">Updated {summary.updatedAt}</span>
            </div>
          )}
        </div>
      </section>

      <WorkflowProvider
        key={record.id}
        initialFlow={initialFlow}
        onFlowChange={(flow) => {
          const next = updateWorkflowRecord(record.id, { flow });
          if (next) {
            setRecord(next);
            setSaveStatus(`Saved ${formatWorkflowDate(next.updatedAt)}`);
          }
        }}
      >
        <WorkflowStudio />
      </WorkflowProvider>

      <EditWorkflowDialog
        open={editDialogOpen}
        defaultValues={{
          name: record.name,
          description: record.description,
          icon: record.icon,
          iconColor: record.iconColor,
        }}
        onSave={(values) => {
          patchRecord(values);
          setEditDialogOpen(false);
        }}
        onClose={() => setEditDialogOpen(false)}
      />
    </main>
  );
}
