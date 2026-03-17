import {
  convertDBEdgeToUIEdge,
  convertDBNodeToUINode,
} from "lib/ai/workflow/shared.workflow";
import Workflow from "@/components/workflow/workflow";
import { createUINode } from "lib/ai/workflow/create-ui-node";
import { NodeKind } from "lib/ai/workflow/workflow.interface";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch workflow structure from mock API
  let initialNodes: ReturnType<typeof convertDBNodeToUINode>[] = [];
  let initialEdges: ReturnType<typeof convertDBEdgeToUIEdge>[] = [];

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workflow/${id}/structure`,
      { cache: "no-store" },
    );
    if (res.ok) {
      const data = await res.json();
      if (data.nodes?.length > 0) {
        initialNodes = data.nodes.map(convertDBNodeToUINode);
        initialEdges = data.edges.map(convertDBEdgeToUIEdge);
      }
    }
  } catch {
    // Use default nodes if API is not available
  }

  // If no nodes yet, provide a starter layout
  if (initialNodes.length === 0) {
    const inputNode = createUINode(NodeKind.Input, {
      position: { x: 0, y: 0 },
      name: "Input",
    });
    const outputNode = createUINode(NodeKind.Output, {
      position: { x: 400, y: 0 },
      name: "Output",
    });
    initialNodes = [inputNode, outputNode];
  }

  return (
    <div className="w-full h-full">
      <Workflow
        key={id}
        workflowId={id}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        hasEditAccess={true}
      />
    </div>
  );
}
