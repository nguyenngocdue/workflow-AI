/**
 * In-memory mock data store.
 * Pre-seeded with all built-in workflow templates so they appear on page load.
 * Data persists for the lifetime of the Node.js server process.
 */

import { DBEdge, DBNode, DBWorkflow } from "app-types/workflow";
import { generateUUID } from "lib/utils";
import { AgentChat, BabyResearch, GetWeather } from "lib/ai/workflow/examples";

export interface MockWorkflow extends Omit<Partial<DBWorkflow>, "createdAt" | "updatedAt"> {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockStructure {
  nodes: Partial<DBNode>[];
  edges: Partial<DBEdge>[];
}

function seedWorkflows(): { workflows: MockWorkflow[]; structures: Map<string, MockStructure> } {
  const workflows: MockWorkflow[] = [];
  const structures = new Map<string, MockStructure>();
  const now = new Date().toISOString();

  const templates = [
    { fn: AgentChat, id: "template-agent-chat" },
    { fn: GetWeather, id: "template-get-weather" },
    { fn: BabyResearch, id: "template-baby-research" },
  ];

  for (const { fn, id } of templates) {
    const example = fn();
    workflows.push({
      id,
      name: example.workflow.name ?? "Untitled",
      description: example.workflow.description ?? "",
      icon: example.workflow.icon,
      visibility: "private",
      isPublished: false,
      userId: "mock-user",
      version: "1",
      createdAt: now,
      updatedAt: now,
    });
    structures.set(id, {
      nodes: example.nodes.map((n) => ({ ...n, id: n.id ?? generateUUID() })),
      edges: example.edges.map((e) => ({ ...e, id: e.id ?? generateUUID() })),
    });
  }

  return { workflows, structures };
}

const { workflows: seeded, structures: seededStructures } = seedWorkflows();

// Mutable in-memory collections
export const workflowStore: MockWorkflow[] = [...seeded];
export const structureStore: Map<string, MockStructure> = new Map(seededStructures);

// Debug: log agent-chat structure at seed time
const _agentChatStructure = seededStructures.get("template-agent-chat");
if (_agentChatStructure) {
  console.log("\n[SEED] agent-chat nodes:");
  for (const n of _agentChatStructure.nodes) {
    const nc = n.nodeConfig as any;
    console.log(`  [${n.kind}] id=${n.id} name=${n.name}`);
    if (n.kind === "output") {
      console.log(`    outputData =>`, JSON.stringify(nc?.outputData));
    }
  }
}
