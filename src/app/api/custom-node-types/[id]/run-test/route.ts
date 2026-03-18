import { NextResponse } from "next/server";
import { getCustomNodeTypeById } from "lib/mock/custom-node-types";
import { runDesignerSubgraph } from "lib/ai/workflow/run-designer-graph";
import type { DesignerGraphNode, DesignerEdge } from "app-types/custom-node-type";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let type = getCustomNodeTypeById(id);
  const body = await req.json().catch(() => ({}));
  const query = (body.query ?? {}) as Record<string, unknown>;

  if (!type && Array.isArray(body.nodes) && body.nodes.length > 0) {
    type = {
      id,
      name: "",
      description: "",
      outputSchema: [],
      nodes: body.nodes as DesignerGraphNode[],
      edges: Array.isArray(body.edges) ? (body.edges as DesignerEdge[]) : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (!type) {
    return NextResponse.json(
      { error: "Node type not found. Save the graph first or pass nodes/edges in the request body." },
      { status: 404 },
    );
  }
  if (!type.nodes?.length) {
    return NextResponse.json(
      { error: "Node type has no graph. Add Input/Output nodes in Node Designer." },
      { status: 400 },
    );
  }
  try {
    const output = await runDesignerSubgraph(type, query);
    return NextResponse.json({ output });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ output: null, error: message }, { status: 200 });
  }
}
