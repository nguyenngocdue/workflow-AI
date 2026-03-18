/**
 * Template for Node Designer: Input → Python Script → Output.
 * Helps users understand how to create a custom node.
 */
import type { DesignerGraphNode, DesignerEdge } from "app-types/custom-node-type";

const INPUT_ID = "template-input-1";
const PYTHON_ID = "template-python-1";
const OUTPUT_ID = "template-output-1";

export const DESIGNER_TEMPLATE = {
  name: "Python Script Example",
  description: "Template: Input → Python Script → Output. Edit Input schema, Python code, and Output mapping.",
  nodes: [
    {
      id: INPUT_ID,
      kind: "input",
      name: "IN[0]",
      description: "",
      nodeConfig: {
        outputSchema: {
          type: "object",
          properties: {
            value: { type: "string", description: "Input value" },
          },
        },
      },
      uiConfig: { position: { x: 80, y: 120 }, type: "default" },
    } as DesignerGraphNode,
    {
      id: PYTHON_ID,
      kind: "python-script",
      name: "Python Script",
      description: "",
      nodeConfig: {
        inputs: [{ id: "in0", name: "IN[0]" }],
        code: `# IN is the list of values from inputs (in order)
# Assign OUT to return the result
value = IN[0] if IN else ""
OUT = {"result": value, "length": len(str(value))}`,
        outputSchema: { type: "object", properties: { OUT: { type: "object" } } },
      },
      uiConfig: { position: { x: 320, y: 100 }, type: "python-script" },
    } as DesignerGraphNode,
    {
      id: OUTPUT_ID,
      kind: "output",
      name: "OUT",
      description: "",
      nodeConfig: {
        outputData: [
          { key: "OUT", source: { nodeId: PYTHON_ID, path: ["OUT"] } },
          { key: "result", source: { nodeId: PYTHON_ID, path: ["OUT", "result"] } },
          { key: "length", source: { nodeId: PYTHON_ID, path: ["OUT", "length"] } },
        ],
      },
      uiConfig: { position: { x: 560, y: 120 }, type: "default" },
    } as DesignerGraphNode,
  ],
  edges: [
    {
      id: "template-e1",
      source: INPUT_ID,
      target: PYTHON_ID,
      sourceHandle: "right",
      targetHandle: "in0",
    },
    {
      id: "template-e2",
      source: PYTHON_ID,
      target: OUTPUT_ID,
      sourceHandle: "out",
      targetHandle: undefined,
    },
  ] as DesignerEdge[],
};

export type DesignerTemplate = typeof DESIGNER_TEMPLATE;
