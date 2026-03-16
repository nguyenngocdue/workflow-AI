import { describe, expect, it } from "vitest";
import { createRuntimeState } from "@/src/core/runtime";
import { NodeKind, type WorkflowData } from "@/src/core/types";

describe("runtime state", () => {
  const workflow: WorkflowData = {
    nodes: [
      {
        id: "input",
        position: { x: 0, y: 0 },
        data: {
          id: "input",
          name: "Input",
          kind: NodeKind.Input,
          outputSchema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                default: "cgoing",
              },
            },
          },
        },
      },
    ],
    edges: [],
  };

  it("stores and reads nested output values", () => {
    const state = createRuntimeState({
      workflow,
      query: {},
    });

    expect(
      state.getOutput({
        nodeId: "input",
        path: ["name"],
      }),
    ).toBe("cgoing");

    state.setOutput(
      {
        nodeId: "v2",
        path: ["person", "name", "first"],
      },
      "Ada",
    );

    expect(
      state.getOutput({
        nodeId: "v2",
        path: ["person", "name", "first"],
      }),
    ).toBe("Ada");
  });
});
