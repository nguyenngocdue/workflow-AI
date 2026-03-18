"use client";

import { PythonScriptNodeData } from "lib/ai/workflow/workflow.interface";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { Input } from "ui/input";
import { useReactFlow } from "@xyflow/react";
import type { UINode } from "lib/ai/workflow/workflow.interface";

export function PythonScriptConfig({ data }: { data: PythonScriptNodeData }) {
  const { updateNodeData } = useReactFlow<UINode>();
  const inputs = data.inputs ?? [{ id: "in0", name: "IN[0]" }];

  return (
    <div className="flex flex-col gap-4 px-4 text-sm">
      <div>
        <Label className="text-xs text-muted-foreground">Input ports</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Use +/- on the node to add/remove. Assign <code>OUT</code> in code for the result. Unconnected ports use the first connected port&apos;s value (e.g. if only IN[0] is wired, IN[1] = IN[0]).
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {inputs.map((input, i) => (
            <Input
              key={input.id}
              value={input.name}
              onChange={(e) => {
                const next = [...inputs];
                next[i] = { ...next[i], name: e.target.value };
                updateNodeData(data.id, { inputs: next });
              }}
              className="h-7 w-16 text-xs"
            />
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Python code</Label>
        <Textarea
          value={data.code ?? ""}
          onChange={(e) => updateNodeData(data.id, { code: e.target.value })}
          placeholder={'# IN[0], IN[1], ... are available as list IN\nOUT = IN[0] + IN[1] if len(IN) > 1 else IN[0]'}
          className="mt-1 min-h-[200px] font-mono text-xs"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
