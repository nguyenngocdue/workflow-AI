import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    name: "Demo Workflow",
    description: "",
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

export async function PUT(_req: Request) {
  return NextResponse.json({ success: true });
}

export async function POST(_req: Request) {
  return NextResponse.json({ success: true });
}
