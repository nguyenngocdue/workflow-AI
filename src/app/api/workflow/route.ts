import { NextResponse } from "next/server";
import { generateUUID } from "@/lib/utils";

const mockWorkflows = [
  {
    id: "demo-workflow-1",
    name: "Demo Workflow",
    description: "A sample workflow for demonstration",
    icon: { type: "emoji", value: "⚡" },
    visibility: "private",
    isPublished: false,
    userId: "mock-user",
    userName: "Demo User",
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(mockWorkflows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newWorkflow = {
    id: generateUUID(),
    name: body.name || "New Workflow",
    description: body.description || "",
    icon: body.icon,
    visibility: "private",
    isPublished: false,
    userId: "mock-user",
    version: "1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return NextResponse.json(newWorkflow);
}
