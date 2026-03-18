"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { DesignerNode } from "app-types/custom-node-type";
import { cn } from "lib/utils";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { Input } from "ui/input";
import { useReactFlow } from "@xyflow/react";

export type DesignerPortData = Omit<DesignerNode, "position">;

export const DesignerPortNode = memo(function DesignerPortNode({
  data,
  id,
  selected,
}: NodeProps<Node<DesignerPortData>>) {
  const isInput = data.kind === "type-input";
  const [editing, setEditing] = useState(false);
  const { updateNodeData } = useReactFlow();

  const handleNameChange = useCallback(
    (name: string) => {
      updateNodeData(id, { name });
    },
    [id, updateNodeData],
  );

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-card px-3 py-2 min-w-[120px] shadow-sm",
        selected && "ring-2 ring-primary",
        isInput ? "border-blue-500/50" : "border-green-500/50",
      )}
    >
      {isInput ? (
        <>
          <Handle type="source" position={Position.Right} className="!w-2 !h-2 !right-0 !bg-blue-500" />
          <div className="flex items-center gap-1.5">
            <ArrowDownToLine className="size-3.5 text-blue-500 shrink-0" />
            {editing ? (
              <Input
                value={data.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setEditing(false)}
                className="h-6 text-xs"
                autoFocus
              />
            ) : (
              <span className="text-xs font-medium truncate" onDoubleClick={() => setEditing(true)}>
                {data.name || "IN"}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">({data.portType})</span>
        </>
      ) : (
        <>
          <Handle type="target" position={Position.Left} className="!w-2 !h-2 !left-0 !bg-green-500" />
          <div className="flex items-center gap-1.5">
            {editing ? (
              <Input
                value={data.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={() => setEditing(false)}
                className="h-6 text-xs"
                autoFocus
              />
            ) : (
              <span className="text-xs font-medium truncate" onDoubleClick={() => setEditing(true)}>
                {data.name || "OUT"}
              </span>
            )}
            <ArrowUpFromLine className="size-3.5 text-green-500 shrink-0" />
          </div>
          <span className="text-[10px] text-muted-foreground">({data.portType})</span>
        </>
      )}
    </div>
  );
});
