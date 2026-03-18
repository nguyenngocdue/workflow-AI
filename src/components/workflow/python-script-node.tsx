"use client";

import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { PythonScriptNodeData } from "lib/ai/workflow/workflow.interface";
import { cn } from "lib/utils";
import { Minus, Plus } from "lucide-react";
import { memo, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { generateUUID } from "lib/utils";
import { NodeIcon } from "./node-icon";
import type { UINode } from "lib/ai/workflow/workflow.interface";

type Props = NodeProps<UINode<import("lib/ai/workflow/workflow.interface").NodeKind.PythonScript>>;

export const PythonScriptNode = memo(function PythonScriptNode({
  data,
  id,
  isConnectable,
  selected,
}: Props) {
  const { updateNodeData } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const inputs = data.inputs ?? [{ id: "in0", name: "IN[0]" }];

  // Force React Flow to recalculate handle positions when input count changes (add/remove IN)
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, inputs.length, updateNodeInternals]);

  const addInput = useCallback(() => {
    const count = inputs.length;
    updateNodeData(id, {
      inputs: [
        ...inputs,
        { id: generateUUID(), name: `IN[${count}]` },
      ],
    });
  }, [id, inputs, updateNodeData]);

  const removeInput = useCallback(() => {
    if (inputs.length <= 1) return;
    updateNodeData(id, {
      inputs: inputs.slice(0, -1),
    });
  }, [id, inputs, updateNodeData]);

  return (
    <div
      data-python-script-node
      className={cn(
        "rounded-lg border-2 bg-card min-w-[140px] shadow-sm flex flex-col overflow-visible",
        selected && "ring-2 ring-primary border-primary/50",
        "border-rose-500/50",
      )}
    >
      <div className="px-3 py-2 border-b border-border/50 font-semibold text-sm text-muted-foreground bg-muted/30 rounded-t-lg shrink-0">
        Python Script
      </div>
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* Left: scrollable input list — all handles stay inside node bounds, no clipping */}
        <div className="flex flex-col py-1.5 pl-2 pr-1 gap-1 max-h-[220px]  shrink-0">
          {inputs.map((input, i) => (
            <div key={input.id} className="relative flex items-center gap-1.5 min-h-[24px]">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className="-left-2! w-2! h-2! right-0! bg-rose-500!"
                style={{ zIndex: 10 }}
                isConnectable={isConnectable}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {input.name}
              </span>
              {i === 0 && (
                <div className="flex items-center gap-0.5 ml-0.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addInput();
                    }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                    title="Add input"
                  >
                    <Plus className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeInput();
                    }}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-40"
                    title="Remove input"
                    disabled={inputs.length <= 1}
                  >
                    <Minus className="size-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Right: output */}
        <div className="flex flex-col justify-center pr-2 pl-4 py-1.5 ml-auto">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">OUT</span>
            <Handle
              type="source"
              position={Position.Right}
              id="out"
              className="w-2! h-2! right-0! bg-rose-500!"
              isConnectable={isConnectable}
            />
          </div>
        </div>
      </div>
      <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border/50 rounded-b-lg flex items-center justify-end">
        <NodeIcon type={data.kind} className="p-0.5!" />
      </div>
    </div>
  );
});
