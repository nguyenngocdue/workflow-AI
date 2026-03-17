import {
  convertDBEdgeToUIEdge,
  convertDBNodeToUINode,
} from "lib/ai/workflow/shared.workflow";
import Workflow from "@/components/workflow/workflow";
import { structureStore } from "lib/mock/store";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try to read from the in-memory store for fast SSR (seeded / existing workflows).
  // If the store doesn't have the entry (module isolation after import), we pass
  // empty arrays — WorkflowCanvas will load nodes via SWR automatically.
  const structure = structureStore.get(id);

  let initialNodes: ReturnType<typeof convertDBNodeToUINode>[] = [];
  let initialEdges: ReturnType<typeof convertDBEdgeToUIEdge>[] = [];

  if (structure && structure.nodes.length > 0) {
    try {
      initialNodes = (
        structure.nodes as Parameters<typeof convertDBNodeToUINode>[0][]
      ).map(convertDBNodeToUINode);
      initialEdges = (
        structure.edges as Parameters<typeof convertDBEdgeToUIEdge>[0][]
      ).map(convertDBEdgeToUIEdge);
    } catch {
      // Conversion failed — fall back to empty so SWR takes over in the client
      initialNodes = [];
      initialEdges = [];
    }
  }

  // NOTE: Do NOT create a fallback Input node here.
  // WorkflowCanvas handles the "truly empty" case inside its SWR onSuccess,
  // so the canvas always reflects the server state regardless of SSR module isolation.

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
