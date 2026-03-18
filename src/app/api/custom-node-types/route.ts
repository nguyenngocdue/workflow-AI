import { NextResponse } from "next/server";
import {
  getCustomNodeTypes,
  createCustomNodeType,
} from "lib/mock/custom-node-types";
import type { CustomNodeTypeField } from "app-types/custom-node-type";

export async function GET() {
  const list = getCustomNodeTypes();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, description, outputSchema, nodes, edges } = body;
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const allowedTypes: CustomNodeTypeField["type"][] = ["string", "number", "boolean", "object", "array"];
  const hasGraph = Array.isArray(nodes) && nodes.length > 0;
  const item = createCustomNodeType({
    name: String(name),
    description: body.description ? String(body.description) : undefined,
    outputSchema: hasGraph
      ? undefined
      : Array.isArray(outputSchema)
        ? outputSchema.map((f: { key: string; type: string; description?: string }) => ({
            key: String(f.key),
            type: allowedTypes.includes(f.type as CustomNodeTypeField["type"]) ? (f.type as CustomNodeTypeField["type"]) : "string",
            description: f.description ? String(f.description) : undefined,
          }))
        : [],
    nodes: hasGraph ? nodes : undefined,
    edges: Array.isArray(edges) ? edges : undefined,
  });
  return NextResponse.json(item);
}
