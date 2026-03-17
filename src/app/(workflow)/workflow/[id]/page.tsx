import {
  convertDBEdgeToUIEdge,
  convertDBNodeToUINode,
} from "lib/ai/workflow/shared.workflow";
import Workflow from "@/components/workflow/workflow";
import { createUINode } from "lib/ai/workflow/create-ui-node";
import { NodeKind } from "lib/ai/workflow/workflow.interface";
import { structureStore } from "lib/mock/store";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const structure = structureStore.get(id);

  let initialNodes: ReturnType<typeof convertDBNodeToUINode>[] = [];
  let initialEdges: ReturnType<typeof convertDBEdgeToUIEdge>[] = [];

  if (structure && structure.nodes.length > 0) {
    initialNodes = (structure.nodes as Parameters<typeof convertDBNodeToUINode>[0][]).map(convertDBNodeToUINode);
    initialEdges = (structure.edges as Parameters<typeof convertDBEdgeToUIEdge>[0][]).map(convertDBEdgeToUIEdge);
  } else {
    // Fallback: empty canvas with just Input node
    initialNodes = [
      createUINode(NodeKind.Input, { position: { x: 0, y: 0 }, name: "Input" }),
    ];
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
