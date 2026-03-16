import {
  NodeKind,
  type RichTextDocument,
  type RichTextPart,
  type WorkflowData,
} from "@/src/core/types";

function mention(nodeId: string, path: string[]): string {
  return JSON.stringify({
    nodeId,
    path,
  });
}

function createTextDocument(parts: Array<string | { nodeId: string; path: string[] }>): RichTextDocument {
  const content: RichTextPart[] = [];
  parts.forEach((part) => {
    if (typeof part === "string") {
      content.push({
        type: "text",
        text: part,
      });
      return;
    }
    content.push({
      type: "mention",
      attrs: {
        label: mention(part.nodeId, part.path),
      },
    });
  });

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content,
      },
    ],
  };
}

export function createSupportWorkflow(): WorkflowData {
  return {
    nodes: [
      {
        id: "input",
        type: "workflow",
        position: { x: 0, y: 0 },
        data: {
          id: "input",
          name: "Request Intake",
          kind: NodeKind.Input,
          description: "Host app feeds agent JSON input here.",
          outputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                default: "order status",
                description: "User problem area",
              },
              urgent: {
                type: "boolean",
                default: false,
                description: "Whether the request needs expedited handling",
              },
              customerTier: {
                type: "string",
                default: "standard",
                enum: ["standard", "priority", "enterprise"],
              },
              channel: {
                type: "string",
                default: "email",
                enum: ["email", "chat", "voice"],
              },
            },
            required: ["topic", "urgent"],
          },
        },
      },
      {
        id: "priority-check",
        type: "workflow",
        position: { x: 360, y: 0 },
        data: {
          id: "priority-check",
          name: "Priority Router",
          kind: NodeKind.Condition,
          description: "Mirrors better-chatbot branching semantics.",
          outputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
              },
              branch: {
                type: "string",
              },
            },
          },
          branches: {
            if: {
              id: "expedite",
              type: "if",
              logicalOperator: "AND",
              conditions: [
                {
                  source: {
                    nodeId: "input",
                    path: ["urgent"],
                  },
                  operator: "is_true",
                },
              ],
            },
            else: {
              id: "standard",
              type: "else",
              logicalOperator: "AND",
              conditions: [],
            },
          },
        },
      },
      {
        id: "priority-template",
        type: "workflow",
        position: { x: 720, y: -130 },
        data: {
          id: "priority-template",
          name: "Priority Reply",
          kind: NodeKind.Template,
          description: "Template nodes keep variable interpolation host-neutral.",
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
            tiptap: createTextDocument([
              "Escalate ",
              { nodeId: "input", path: ["topic"] },
              " for the ",
              { nodeId: "input", path: ["customerTier"] },
              " customer on ",
              { nodeId: "input", path: ["channel"] },
              " and attach the branch label immediately.",
            ]),
          },
        },
      },
      {
        id: "standard-template",
        type: "workflow",
        position: { x: 720, y: 130 },
        data: {
          id: "standard-template",
          name: "Standard Reply",
          kind: NodeKind.Template,
          description: "Branch-specific reply for normal workload.",
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
            tiptap: createTextDocument([
              "Handle ",
              { nodeId: "input", path: ["topic"] },
              " through the normal queue for the ",
              { nodeId: "input", path: ["customerTier"] },
              " customer on ",
              { nodeId: "input", path: ["channel"] },
              ".",
            ]),
          },
        },
      },
      {
        id: "output",
        type: "workflow",
        position: { x: 1080, y: 0 },
        data: {
          id: "output",
          name: "Agent Payload",
          kind: NodeKind.Output,
          description: "Shape that another host app can read and instantiate as an agent payload.",
          outputSchema: {
            type: "object",
            properties: {
              branch: {
                type: "string",
              },
              priorityMessage: {
                type: "string",
              },
              standardMessage: {
                type: "string",
              },
              topic: {
                type: "string",
              },
            },
          },
          outputData: [
            {
              key: "branch",
              source: {
                nodeId: "priority-check",
                path: ["branch"],
              },
            },
            {
              key: "priorityMessage",
              source: {
                nodeId: "priority-template",
                path: ["template"],
              },
            },
            {
              key: "standardMessage",
              source: {
                nodeId: "standard-template",
                path: ["template"],
              },
            },
            {
              key: "topic",
              source: {
                nodeId: "input",
                path: ["topic"],
              },
            },
          ],
        },
      },
    ],
    edges: [
      {
        id: "e-input-priority",
        source: "input",
        target: "priority-check",
      },
      {
        id: "e-priority-template",
        source: "priority-check",
        target: "priority-template",
        sourceHandle: "expedite",
      },
      {
        id: "e-standard-template",
        source: "priority-check",
        target: "standard-template",
        sourceHandle: "standard",
      },
      {
        id: "e-priority-output",
        source: "priority-template",
        target: "output",
      },
      {
        id: "e-standard-output",
        source: "standard-template",
        target: "output",
      },
    ],
  };
}

export const supportWorkflowExampleInput = {
  topic: "subscription upgrade",
  urgent: false,
  customerTier: "priority",
  channel: "chat",
};
