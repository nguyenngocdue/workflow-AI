import { DBEdge, DBNode } from "app-types/workflow";

// Fixed IDs so hot-reloads don't change node IDs and break outputData references
const INPUT_ID = "ac-input-001";
const LLM_ID = "ac-llm-001";
const CONDITION_ID = "ac-condition-001";
const OUTPUT_SUCCESS_ID = "ac-output-success-001";
const OUTPUT_FALLBACK_ID = "ac-output-fallback-001";
const NOTE_ID = "ac-note-001";

export const agentChatNodes: Partial<DBNode>[] = [
  {
    id: INPUT_ID,
    kind: "input",
    name: "INPUT",
    description: "Receive the user's question",
    uiConfig: { position: { x: 0, y: 0 }, type: "default" },
    nodeConfig: {
      kind: "input",
      outputSchema: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question or message from the user",
          },
        },
        required: ["question"],
      },
    },
  },
  {
    id: LLM_ID,
    kind: "llm",
    name: "AI AGENT",
    description: "Process the question with an AI model",
    uiConfig: { position: { x: 380, y: 0 }, type: "default" },
    nodeConfig: {
      kind: "llm",
      model: { provider: "anthropic", model: "claude-sonnet-4-5" },
      outputSchema: {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description: "The AI model's response to the user's question",
          },
        },
      },
      messages: [
        {
          role: "system",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "You are a helpful AI assistant. Answer the user's question clearly and concisely. If you cannot answer, respond with an empty string.",
                  },
                ],
              },
            ],
          },
        },
        {
          role: "user",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "mention",
                    attrs: {
                      id: "ac-mention-001",
                      label: JSON.stringify({ nodeId: INPUT_ID, path: ["question"] }),
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: CONDITION_ID,
    kind: "condition",
    name: "ANSWER CHECK",
    description: "Route based on whether the AI produced an answer",
    uiConfig: { position: { x: 760, y: 0 }, type: "default" },
    nodeConfig: {
      kind: "condition",
      outputSchema: { type: "object", properties: {} },
      branches: {
        if: {
          id: "if",
          logicalOperator: "AND",
          type: "if",
          conditions: [
            {
              source: {
                nodeId: LLM_ID,
                path: ["answer"],
                nodeName: "AI AGENT",
                type: "string",
              },
              operator: "is_not_empty",
            },
          ],
        },
        else: {
          id: "else",
          logicalOperator: "AND",
          type: "else",
          conditions: [],
        },
      },
    },
  },
  {
    id: OUTPUT_SUCCESS_ID,
    kind: "output",
    name: "OUTPUT (Success)",
    description: "Return the AI answer to the user",
    uiConfig: { position: { x: 1140, y: -160 }, type: "default" },
    nodeConfig: {
      kind: "output",
      outputSchema: { type: "object", properties: {} },
      outputData: [
        {
          key: "answer",
          source: { nodeId: LLM_ID, path: ["answer"] },
        },
      ],
    },
  },
  {
    id: OUTPUT_FALLBACK_ID,
    kind: "output",
    name: "OUTPUT (Fallback)",
    description: "Return a fallback message when AI has no answer",
    uiConfig: { position: { x: 1140, y: 160 }, type: "default" },
    nodeConfig: {
      kind: "output",
      outputSchema: { type: "object", properties: {} },
      outputData: [
        {
          key: "answer",
          source: { nodeId: LLM_ID, path: ["answer"] },
        },
      ],
    },
  },
  {
    id: NOTE_ID,
    kind: "note",
    name: "NOTE",
    description: `# 🤖 Agent Chat Workflow

Simple conversational AI with conditional routing.

### ➡️ Pipeline

1. **INPUT** — User provides a \`question\`
2. **AI AGENT (LLM)** — Calls the selected model, returns \`answer\`
3. **ANSWER CHECK (Condition)**
   - **IF** \`answer\` is not empty → **OUTPUT (Success)**
   - **ELSE** (empty / no answer) → **OUTPUT (Fallback)**

### 🔧 Customization

- Edit the **system prompt** in AI AGENT to set personality or domain
- Change the **model** (GPT-4o, Claude, Gemini…) in the LLM node
- Add more fields to **INPUT** schema (e.g. \`context\`, \`language\`)
- Customize fallback message in **OUTPUT (Fallback)**
`,
    uiConfig: { position: { x: 300, y: -600 }, type: "default" },
    nodeConfig: {
      kind: "note",
      outputSchema: { type: "object", properties: {} },
    },
  },
];

export const agentChatEdges: Partial<DBEdge>[] = [
  {
    source: INPUT_ID,
    target: LLM_ID,
    uiConfig: {},
  },
  {
    source: LLM_ID,
    target: CONDITION_ID,
    uiConfig: {},
  },
  {
    source: CONDITION_ID,
    target: OUTPUT_SUCCESS_ID,
    uiConfig: { sourceHandle: "if" },
  },
  {
    source: CONDITION_ID,
    target: OUTPUT_FALLBACK_ID,
    uiConfig: { sourceHandle: "else" },
  },
];
