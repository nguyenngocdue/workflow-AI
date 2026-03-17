import { NextResponse } from "next/server";
import { structureStore, workflowStore } from "lib/mock/store";
import { encodeWorkflowEvent } from "lib/ai/workflow/shared.workflow";
import { createWorkflowExecutor } from "lib/ai/workflow/executor/workflow-executor";
import { toAny } from "lib/utils";
import { DBEdge, DBNode } from "app-types/workflow";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const workflow = workflowStore.find((w) => w.id === id);
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const structure = structureStore.get(id);
  if (!structure || structure.nodes.length === 0) {
    return NextResponse.json({ error: "Workflow has no nodes" }, { status: 422 });
  }

  const { query } = await req.json().catch(() => ({ query: {} }));

  const nodes = structure.nodes as DBNode[];
  const edges = structure.edges as DBEdge[];

  const app = createWorkflowExecutor({ nodes, edges });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isAborted = false;

      app.subscribe((evt) => {
        if (isAborted) return;
        // Skip internal SKIP node events
        if (
          (evt.eventType == "NODE_START" || evt.eventType == "NODE_END") &&
          evt.node.name == "SKIP"
        ) {
          return;
        }
        try {
          // Serialize Error objects so they survive JSON encoding
          const err = toAny(evt)?.error;
          if (err) {
            toAny(evt).error = {
              name: err.name || "ERROR",
              message: err?.message || String(err),
            };
          }
          const data = encodeWorkflowEvent(evt);
          controller.enqueue(encoder.encode(data));
          if (evt.eventType === "WORKFLOW_END") {
            controller.close();
          }
        } catch (error) {
          console.error("Stream write error:", error);
          controller.error(error);
        }
      });

      req.signal.addEventListener("abort", () => {
        isAborted = true;
        void app.exit();
        controller.close();
      });

      // Run the workflow (non-blocking)
      app
        .run({ query }, { disableHistory: true, timeout: 1000 * 60 * 5 })
        .then((result) => {
          if (!result.isOk) {
            console.error("[execute] Workflow error:", result.error);
          }
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
