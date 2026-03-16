"use client";

import { Fragment, memo, type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeKind } from "@/src/core/types";
import {
  type CanvasNode,
  getConditionHandles,
  getNodeAccent,
  getNodeGlyph,
  getNodeKindTitle,
  getNodePreviewLines,
} from "@/src/features/editor/workflow-reactflow";

const BRANCH_HANDLE_START = 82;
const BRANCH_HANDLE_GAP = 28;

export const WorkflowCanvasNode = memo(function WorkflowCanvasNode({
  data,
  selected,
}: NodeProps<CanvasNode>) {
  const node = data.workflowNode;
  const summaryLines = getNodePreviewLines(node.data);
  const isCondition = node.data.kind === NodeKind.Condition;
  const isNote = node.data.kind === NodeKind.Note;
  const canReceive = ![NodeKind.Input, NodeKind.Note].includes(node.data.kind);
  const canSend = ![NodeKind.Output, NodeKind.Note].includes(node.data.kind);
  const runtimeClass = data.runtimeStatus ? `is-${data.runtimeStatus}` : "";
  const branches =
    node.data.kind === NodeKind.Condition ? getConditionHandles(node.data) : [];

  return (
    <div
      className={[
        "flow-node-card", // keeps ::after pseudo-element + handle colour CSS rules
        selected ? "is-selected border-[var(--node-accent)]! -translate-y-px shadow-[0_24px_50px_rgba(20,33,61,0.18)]" : "",
        runtimeClass,     // is-running | is-success | is-fail (needed for handle CSS)
        runtimeClass === "is-running" || runtimeClass === "is-success" ? "border-[var(--ok)]" : "",
        runtimeClass === "is-fail" ? "border-[var(--error)]" : "",
        node.data.kind === NodeKind.Condition ? "min-h-[176px]" : "",
        node.data.kind === NodeKind.Note
          ? "w-[320px] min-h-[188px] [background:linear-gradient(180deg,rgba(255,252,244,0.94),rgba(249,244,231,0.94))]"
          : "",
        "relative w-[292px] min-h-[148px] px-[18px] pt-4 pb-[14px] rounded-[22px] border-2 border-[rgba(20,33,61,0.12)]",
        "[background:linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,250,240,0.92))]",
        "shadow-[0_18px_46px_rgba(20,33,61,0.14)] transition-[transform,box-shadow,border-color] duration-[120ms]",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--node-accent": getNodeAccent(node.data.kind),
        } as CSSProperties
      }
    >
      {canReceive && (
        <Handle
          type="target"
          position={Position.Left}
          className="flow-node-handle flow-node-handle--target"
        />
      )}

      <div className="relative z-[1] grid grid-cols-[auto_1fr_auto] items-start gap-3">
        <div className="inline-flex items-center justify-center min-w-[42px] h-[42px] px-[10px] rounded-[14px] bg-[var(--node-accent)] text-white text-[11px] font-extrabold tracking-[0.08em]">{getNodeGlyph(node.data.kind)}</div>
        <div className="grid gap-1 min-w-0">
          <span className="text-[var(--muted)] text-[10px] tracking-[0.14em] uppercase">{getNodeKindTitle(node.data.kind)}</span>
          <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[16px] tracking-[-0.03em]">{node.data.name}</strong>
        </div>
        {data.runtimeStatus && (
          <span className={`inline-flex items-center justify-center min-h-[28px] px-[10px] rounded-full text-[10px] font-bold uppercase tracking-[0.08em] ${
            data.runtimeStatus === "running" || data.runtimeStatus === "success"
              ? "bg-[rgba(31,122,77,0.12)] text-[var(--ok)]"
              : "bg-[rgba(180,35,24,0.12)] text-[var(--error)]"
          }`}>
            {data.runtimeStatus}
          </span>
        )}
      </div>

      {summaryLines.length > 0 && (
        <div className="relative z-[1] grid gap-2 mt-[14px]">
          {summaryLines.map((line, index) => (
            <div className="overflow-hidden text-ellipsis whitespace-nowrap px-[10px] py-2 rounded-[12px] bg-[rgba(20,33,61,0.05)] text-[12px]" key={`${node.id}-${index}`}>
              {line}
            </div>
          ))}
        </div>
      )}

      {node.data.description && !isNote && (
        <p className="relative z-[1] mt-3 mb-0 text-[var(--muted)] text-[12px] leading-[1.5]">{node.data.description}</p>
      )}

      {isNote && (
        <div className="relative z-[1] mt-[14px] text-[var(--text)] leading-[1.62] whitespace-pre-wrap">
          {node.data.description || "Design-time note"}
        </div>
      )}

      {canSend && !isCondition && (
        <Handle
          type="source"
          position={Position.Right}
          className="flow-node-handle flow-node-handle--source"
        />
      )}

      {isCondition &&
        branches.map((branch, index) => (
          <Fragment key={branch.id}>
            <span
              className="absolute right-[18px] -translate-y-1/2 z-[1] px-2 py-1 rounded-full bg-[rgba(20,33,61,0.06)] text-[var(--muted)] text-[10px] font-bold tracking-[0.12em]"
              style={{
                top: BRANCH_HANDLE_START - 10 + index * BRANCH_HANDLE_GAP,
              }}
            >
              {branch.label}
            </span>
            <Handle
              id={branch.id}
              type="source"
              position={Position.Right}
              className="flow-node-handle flow-node-handle--branch"
              style={{
                top: BRANCH_HANDLE_START + index * BRANCH_HANDLE_GAP,
              }}
            />
          </Fragment>
        ))}
    </div>
  );
});
