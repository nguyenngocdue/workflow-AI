import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    name: "Demo Workflow",
    description: "A sample workflow",
    icon: { type: "emoji", value: "⚡" },
    visibility: "private",
    isPublished: false,
    userId: "mock-user",
    version: "1",
    nodes: [],
    edges: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json({
    ...body,
    id,
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  return NextResponse.json({ success: true });
}
