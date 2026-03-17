import { NextResponse } from "next/server";
import { workflowStore, structureStore } from "lib/mock/store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = workflowStore.find((w) => w.id === id);
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const structure = structureStore.get(id) ?? { nodes: [], edges: [] };
  return NextResponse.json({ ...workflow, ...structure });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const idx = workflowStore.findIndex((w) => w.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  workflowStore[idx] = { ...workflowStore[idx], ...body, id, updatedAt: new Date().toISOString() };
  return NextResponse.json(workflowStore[idx]);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = workflowStore.findIndex((w) => w.id === id);
  if (idx !== -1) {
    workflowStore.splice(idx, 1);
    structureStore.delete(id);
  }
  return NextResponse.json({ success: true });
}
