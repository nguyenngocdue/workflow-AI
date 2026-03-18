import { NextResponse } from "next/server";
import {
  getCustomNodeTypeById,
  updateCustomNodeType,
  deleteCustomNodeType,
} from "lib/mock/custom-node-types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = getCustomNodeTypeById(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const updated = updateCustomNodeType(id, {
    name: body.name,
    description: body.description,
    outputSchema: body.outputSchema,
    nodes: body.nodes,
    edges: body.edges,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = deleteCustomNodeType(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
