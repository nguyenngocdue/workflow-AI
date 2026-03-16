import { describe, expect, it } from "vitest";
import { extractWorkflowDiff } from "@/src/core/diff";
import { wouldCreateCycle } from "@/src/core/cycle";
import { NodeKind, type WorkflowData, type WorkflowEdge, type WorkflowNode } from "@/src/core/types";

function createNode(
  id: string,
  name: string,
  position = { x: 0, y: 0 },
): WorkflowNode {
  return {
    id,
    position,
    data: {
      id,
      name,
      kind: NodeKind.Input,
      outputSchema: { type: "object", properties: {} },
    },
  };
}

function createEdge(id: string, source: string, target: string): WorkflowEdge {
  return {
    id,
    source,
    target,
  };
}

describe("graph helpers", () => {
  it("detects added and updated nodes and edges", () => {
    const oldData: WorkflowData = {
      nodes: [createNode("node-1", "Node 1")],
      edges: [createEdge("edge-1", "node-1", "node-2")],
    };
    const newData: WorkflowData = {
      nodes: [
        createNode("node-1", "Node 1"),
        createNode("node-2", "Node 2", { x: 200, y: 120 }),
      ],
      edges: [
        createEdge("edge-1", "node-1", "node-2"),
        createEdge("edge-2", "node-2", "node-3"),
      ],
    };

    const result = extractWorkflowDiff(oldData, newData);

    expect(result.deleteNodes).toHaveLength(0);
    expect(result.deleteEdges).toHaveLength(0);
    expect(result.updateNodes).toHaveLength(1);
    expect(result.updateEdges).toHaveLength(1);
    expect(result.updateNodes[0].id).toBe("node-2");
    expect(result.updateEdges[0].id).toBe("edge-2");
  });

  it("blocks direct cycle creation", () => {
    const result = wouldCreateCycle(
      {
        source: "B",
        target: "A",
      },
      [{ source: "A", target: "B" }],
    );

    expect(result).toBe(true);
  });
});
