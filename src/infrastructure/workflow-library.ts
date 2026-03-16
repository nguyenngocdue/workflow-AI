"use client";

import { NodeKind, type WorkflowData } from "@/src/core/types";
import { createSupportWorkflow } from "@/src/examples/support-workflow";

const STORAGE_KEY = "chatbot-workflow:library:v1";

export type WorkflowVisibility = "private" | "public" | "readonly";

export type WorkflowRecord = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  iconColor?: string;
  visibility: WorkflowVisibility;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  flow: WorkflowData;
};

export function createStarterWorkflow(): WorkflowData {
  return {
    nodes: [
      {
        id: "input-1",
        type: "workflow",
        position: { x: 0, y: 0 },
        data: {
          id: "input-1",
          name: "Request Intake",
          kind: NodeKind.Input,
          description: "Entry node for app-provided input.",
          outputSchema: {
            type: "object",
            properties: {
              input: {
                type: "string",
                description: "Primary workflow input",
              },
            },
            required: [],
          },
        },
      },
      {
        id: "output-1",
        type: "workflow",
        position: { x: 360, y: 0 },
        data: {
          id: "output-1",
          name: "Agent Payload",
          kind: NodeKind.Output,
          description: "Final payload for downstream apps.",
          outputSchema: {
            type: "object",
            properties: {
              result: {
                type: "string",
              },
            },
          },
          outputData: [
            {
              key: "result",
              source: {
                nodeId: "input-1",
                path: ["input"],
              },
            },
          ],
        },
      },
    ],
    edges: [
      {
        id: "edge-1",
        source: "input-1",
        target: "output-1",
      },
    ],
  };
}

function createTimestamp() {
  return new Date().toISOString();
}

function createId() {
  return `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createWorkflowRecord(args?: {
  name?: string;
  description?: string;
  visibility?: WorkflowVisibility;
  flow?: WorkflowData;
}): WorkflowRecord {
  const timestamp = createTimestamp();
  return {
    id: createId(),
    name: args?.name ?? "Untitled Workflow",
    description:
      args?.description ?? "Package-hosted workflow ready for downstream agent apps.",
    visibility: args?.visibility ?? "private",
    isPublished: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    flow: args?.flow ?? createStarterWorkflow(),
  };
}

function createSeedRecords(): WorkflowRecord[] {
  const starter = createWorkflowRecord({
    name: "Starter Workflow",
    description:
      "Minimal input to output workflow for quick package smoke tests.",
    flow: createStarterWorkflow(),
  });
  const support = createWorkflowRecord({
    name: "Support Routing",
    description:
      "Example routing flow derived from the current package fixture.",
    flow: createSupportWorkflow(),
  });
  return [starter, support];
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function writeRecords(records: WorkflowRecord[]) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function loadWorkflowRecords(): WorkflowRecord[] {
  if (!isBrowser()) {
    return createSeedRecords();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedRecords();
    writeRecords(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as WorkflowRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = createSeedRecords();
      writeRecords(seeded);
      return seeded;
    }
    return parsed;
  } catch {
    const seeded = createSeedRecords();
    writeRecords(seeded);
    return seeded;
  }
}

export function getWorkflowRecord(workflowId: string) {
  return loadWorkflowRecords().find((record) => record.id === workflowId);
}

export function saveWorkflowRecord(record: WorkflowRecord) {
  const records = loadWorkflowRecords();
  const nextRecords = records.some((item) => item.id === record.id)
    ? records.map((item) => (item.id === record.id ? record : item))
    : [...records, record];
  writeRecords(nextRecords);
  return record;
}

export function updateWorkflowRecord(
  workflowId: string,
  patch: Partial<Omit<WorkflowRecord, "id" | "createdAt">>,
) {
  const record = getWorkflowRecord(workflowId);
  if (!record) {
    return undefined;
  }

  const nextRecord: WorkflowRecord = {
    ...record,
    ...patch,
    updatedAt: patch.updatedAt ?? createTimestamp(),
  };
  saveWorkflowRecord(nextRecord);
  return nextRecord;
}

export function createAndStoreWorkflow(args?: {
  name?: string;
  description?: string;
  visibility?: WorkflowVisibility;
  flow?: WorkflowData;
}) {
  const record = createWorkflowRecord(args);
  saveWorkflowRecord(record);
  return record;
}

export function duplicateWorkflow(workflowId: string) {
  const record = getWorkflowRecord(workflowId);
  if (!record) {
    return undefined;
  }

  const copy = createWorkflowRecord({
    name: `${record.name} Copy`,
    description: record.description,
    visibility: record.visibility,
    flow: JSON.parse(JSON.stringify(record.flow)) as WorkflowData,
  });
  saveWorkflowRecord(copy);
  return copy;
}

export function deleteWorkflow(workflowId: string) {
  const nextRecords = loadWorkflowRecords().filter((record) => record.id !== workflowId);
  writeRecords(nextRecords);
  return nextRecords;
}

export function formatWorkflowDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
