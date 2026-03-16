"use client";

import { NodeKind } from "@/src/core/types";
import {
  getNodeAccent,
  getNodeGlyph,
} from "@/src/features/editor/workflow-reactflow";
import { getNodeKindLabel } from "@/src/features/editor/workflow-editor-utils";

const NODE_DESCRIPTIONS: Record<NodeKind, string> = {
  [NodeKind.Input]: "Entry point for the workflow. Defines the input schema.",
  [NodeKind.Output]: "Final payload that host apps consume.",
  [NodeKind.LLM]: "Call an LLM to generate text or structured output.",
  [NodeKind.Tool]: "Invoke an MCP tool or app-level tool.",
  [NodeKind.Http]: "Perform an HTTP request to any endpoint.",
  [NodeKind.Condition]: "Route execution with if/else-if/else branches.",
  [NodeKind.Template]: "Render text templates with variable substitution.",
  [NodeKind.Note]: "Design-time documentation that doesn't execute.",
  [NodeKind.Code]: "Reserved for future parity.",
};

const DISPLAY_KINDS = [
  NodeKind.Input,
  NodeKind.LLM,
  NodeKind.Tool,
  NodeKind.Condition,
  NodeKind.Template,
  NodeKind.Http,
  NodeKind.Output,
  NodeKind.Note,
  NodeKind.Code,
];

export function WorkflowGreeting() {
  return (
    <div className="grid gap-6 p-7 text-center">
      <h3 className="m-0 text-[1.3rem] tracking-[-0.03em]">Build your workflow</h3>
      <p className="m-0 text-[var(--muted)] leading-[1.6] max-w-[56ch] justify-self-center">
        A workflow is a directed graph of nodes that process data step by step.
        Use the palette on the left to add nodes, then connect them to define
        execution order. Each node type serves a different purpose:
      </p>

      <div className="grid grid-cols-3 gap-[10px] max-w-[600px] justify-self-center">
        {DISPLAY_KINDS.map((kind) => (
          <div
            className="grid gap-2 p-4 rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white/[.68] text-center transition-[transform,border-color] duration-[120ms] hover:-translate-y-0.5 hover:border-[rgba(221,107,32,0.28)]"
            key={kind}
          >
            <div
              className="inline-flex items-center justify-center w-[42px] h-[42px] mx-auto rounded-[14px] text-white text-[11px] font-extrabold tracking-[0.08em]"
              style={{ background: getNodeAccent(kind) }}
            >
              {getNodeGlyph(kind)}
            </div>
            <strong className="text-[0.92rem]">{getNodeKindLabel(kind)}</strong>
            <small className="text-[var(--muted)] text-[0.78rem] leading-[1.4]">{NODE_DESCRIPTIONS[kind]}</small>
          </div>
        ))}
      </div>

      <div className="mt-[14px] px-[14px] py-3 rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white/[.58] text-[var(--muted)] max-w-[480px] justify-self-center">
        <strong>Example:</strong> Start with an Input node, add an LLM node to
        process the input, use a Condition node to branch based on the result,
        then connect to an Output node.
      </div>
    </div>
  );
}
