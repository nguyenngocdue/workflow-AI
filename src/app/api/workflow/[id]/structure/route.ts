import { NextResponse } from "next/server";
import { workflowStore, structureStore } from "lib/mock/store";
import { generateUUID } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = workflowStore.find((w) => w.id === id);
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const structure = structureStore.get(id) ?? { nodes: [], edges: [] };
  return NextResponse.json({ ...workflow, ...structure });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const current = structureStore.get(id) ?? { nodes: [], edges: [] };

  // Delta update: merge updateNodes, apply deleteNodes/deleteEdges
  const deleteNodeIds: string[] = body.deleteNodes ?? [];
  const deleteEdgeIds: string[] = body.deleteEdges ?? [];

  const incomingNodes = (body.nodes ?? []).map((n: Record<string, unknown>) => ({
    ...n,
    id: (n.id as string) ?? generateUUID(),
  }));
  const incomingEdges = (body.edges ?? []).map((e: Record<string, unknown>) => ({
    ...e,
    id: (e.id as string) ?? generateUUID(),
  }));

  // Keep existing nodes not deleted, overwrite/add with incoming
  const existingNodes = current.nodes.filter(
    (n) => !deleteNodeIds.includes(n.id as string),
  );
  const nodeMap = new Map(existingNodes.map((n) => [n.id, n]));
  for (const node of incomingNodes) {
    nodeMap.set(node.id, node);
  }

  // Same for edges
  const existingEdges = current.edges.filter(
    (e) => !deleteEdgeIds.includes(e.id as string),
  );
  const edgeMap = new Map(existingEdges.map((e) => [e.id, e]));
  for (const edge of incomingEdges) {
    edgeMap.set(edge.id, edge);
  }

  structureStore.set(id, {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  });

  const workflow = workflowStore.find((w) => w.id === id);
  if (workflow) workflow.updatedAt = new Date().toISOString();

  return NextResponse.json({ success: true });
}
