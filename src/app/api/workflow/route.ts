import { NextResponse } from "next/server";
import { generateUUID } from "@/lib/utils";
import { workflowStore, structureStore, MockWorkflow } from "lib/mock/store";

export async function GET() {
  return NextResponse.json([...workflowStore]);
}

export async function POST(req: Request) {
  const body = await req.json();
  const now = new Date().toISOString();
  const newWorkflow: MockWorkflow = {
    id: generateUUID(),
    name: body.name || "New Workflow",
    description: body.description || "",
    icon: body.icon,
    visibility: body.visibility || "private",
    isPublished: body.isPublished ?? false,
    userId: "mock-user",
    version: "1",
    createdAt: now,
    updatedAt: now,
  };
  workflowStore.push(newWorkflow);
  structureStore.set(newWorkflow.id, { nodes: [], edges: [] });
  return NextResponse.json(newWorkflow);
}
