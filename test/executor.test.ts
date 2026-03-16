import { describe, expect, it } from "vitest";
import { createWorkflowAgent } from "@/src/core/executor";
import { NodeKind, type WorkflowData } from "@/src/core/types";

function createWorkflow(): WorkflowData {
  return {
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
              shouldGoTrue: {
                type: "boolean",
              },
            },
          },
        },
      },
      {
        id: "condition",
        position: { x: 1, y: 0 },
        data: {
          id: "condition",
          name: "Condition",
          kind: NodeKind.Condition,
          outputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
              },
            },
          },
          branches: {
            if: {
              id: "true",
              type: "if",
              logicalOperator: "AND",
              conditions: [
                {
                  source: {
                    nodeId: "input",
                    path: ["shouldGoTrue"],
                  },
                  operator: "is_true",
                },
              ],
            },
            else: {
              id: "false",
              type: "else",
              logicalOperator: "AND",
              conditions: [],
            },
          },
        },
      },
      {
        id: "true-template",
        position: { x: 2, y: -1 },
        data: {
          id: "true-template",
          name: "True Path",
          kind: NodeKind.Template,
          outputSchema: {
            type: "object",
            properties: {
              template: {
                type: "string",
              },
            },
          },
          template: {
            type: "tiptap",
            tiptap: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "TRUE" }],
                },
              ],
            },
          },
        },
      },
      {
        id: "false-template",
        position: { x: 2, y: 1 },
        data: {
          id: "false-template",
          name: "False Path",
          kind: NodeKind.Template,
          outputSchema: {
            type: "object",
            properties: {
              template: {
                type: "string",
              },
            },
          },
          template: {
            type: "tiptap",
            tiptap: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "FALSE" }],
                },
              ],
            },
          },
        },
      },
      {
        id: "output",
        position: { x: 3, y: 0 },
        data: {
          id: "output",
          name: "Output",
          kind: NodeKind.Output,
          outputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
              },
              trueText: {
                type: "string",
              },
              falseText: {
                type: "string",
              },
            },
          },
          outputData: [
            {
              key: "branch",
              source: {
                nodeId: "condition",
                path: ["branch"],
              },
            },
            {
              key: "trueText",
              source: {
                nodeId: "true-template",
                path: ["template"],
              },
            },
            {
              key: "falseText",
              source: {
                nodeId: "false-template",
                path: ["template"],
              },
            },
          ],
        },
      },
    ],
    edges: [
      { id: "e1", source: "input", target: "condition" },
      { id: "e2", source: "condition", target: "true-template", sourceHandle: "true" },
      { id: "e3", source: "condition", target: "false-template", sourceHandle: "false" },
      { id: "e4", source: "true-template", target: "output" },
      { id: "e5", source: "false-template", target: "output" },
    ],
  };
}

describe("workflow executor", () => {
  it("runs only the selected branch and still reaches output", async () => {
    const workflow = createWorkflow();
    const agent = createWorkflowAgent({ workflow });

    const visited: string[] = [];
    agent.subscribe((event) => {
      if (event.eventType === "NODE_START") {
        visited.push(event.node.name);
      }
    });

    const result = await agent.run({
      shouldGoTrue: true,
    });

    expect(result.isOk).toBe(true);
    expect(visited).toContain("Input");
    expect(visited).toContain("Condition");
    expect(visited).toContain("True Path");
    expect(visited).toContain("Output");
    expect(visited).not.toContain("False Path");
    expect(result.output).toEqual({
      branch: "true",
      trueText: "TRUE",
      falseText: undefined,
    });
  });
});
