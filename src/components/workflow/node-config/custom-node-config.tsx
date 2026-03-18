"use client";

import { CustomNodeData, UINode } from "lib/ai/workflow/workflow.interface";
import { memo, useCallback, useMemo, useEffect } from "react";
import { ChevronDownIcon, VariableIcon, TriangleAlertIcon } from "lucide-react";
import { VariableSelect } from "../variable-select";
import { useReactFlow } from "@xyflow/react";
import { Label } from "ui/label";
import { findJsonSchemaByPath } from "lib/ai/workflow/shared.workflow";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import type { CustomNodeTypeDefinition } from "app-types/custom-node-type";

export const CustomNodeDataConfig = memo(function CustomNodeDataConfig({
  data,
}: {
  data: CustomNodeData;
}) {
  const { getNodes, updateNodeData } = useReactFlow();
  const { data: type } = useSWR<CustomNodeTypeDefinition | null>(
    data.customNodeTypeId ? `/api/custom-node-types/${data.customNodeTypeId}` : null,
    fetcher,
  );

  // Sync outputData and outputSchema with type when type first loads
  useEffect(() => {
    if (!type || !data.customNodeTypeId) return;
    const keysFromType = type.outputSchema.map((f) => f.key);
    const currentKeys = (data.outputData ?? []).map((o) => o.key);
    const missing = keysFromType.filter((k) => !currentKeys.includes(k));
    const outputSchemaFromType = {
      type: "object" as const,
      properties: Object.fromEntries(
        type.outputSchema.map((f) => [
          f.key,
          { type: f.type, description: f.description },
        ]),
      ),
    };
    if (missing.length === 0 && (data.outputData ?? []).length >= keysFromType.length) return;
    updateNodeData(data.id, (node) => {
      const prev = node.data as CustomNodeData;
      const next = [...(prev.outputData ?? [])];
      missing.forEach((key) => next.push({ key, source: undefined }));
      return {
        outputData: next,
        outputSchema: outputSchemaFromType,
      };
    });
  }, [type?.id, data.customNodeTypeId, data.id, updateNodeData]);

  const outputVariables = useMemo(() => {
    const nodes = getNodes() as UINode[];
    const schemaFromType = type?.outputSchema ?? [];
    const list = (data.outputData.length ? data.outputData : schemaFromType.map((f) => ({ key: f.key, source: undefined as any })))
      .map((item) => {
        const { key, source } = item;
        const targetNode = nodes.find((n) => n.data.id === source?.nodeId);
        const schema = targetNode
          ? findJsonSchemaByPath(targetNode.data.outputSchema, source?.path ?? [])
          : undefined;
        const typeField = schemaFromType.find((f) => f.key === key);
        return {
          key,
          type: typeField?.type ?? "string",
          schema,
          path: source?.path ?? [],
          nodeName: targetNode?.data.name,
          nodeId: targetNode?.data.id,
          isNotFound: (source && !targetNode) || (targetNode && !schema),
        };
      });
    return list;
  }, [data.outputData, type?.outputSchema, getNodes]);

  const updateOutputVariable = useCallback(
    (index: number, source: { nodeId: string; path: string[] } | undefined) => {
      updateNodeData(data.id, (node) => {
        const prev = node.data as CustomNodeData;
        return {
          outputData: prev.outputData.map((v, i) =>
            i === index ? { ...v, source } : v,
          ),
        };
      });
    },
    [data.id, updateNodeData],
  );

  if (!type && data.customNodeTypeId) {
    return (
      <div className="px-4 text-sm text-muted-foreground">
        Loading node type…
      </div>
    );
  }
  if (!type) {
    return (
      <div className="px-4 text-sm text-destructive">
        Node type not found. Delete this node or select another type.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm px-4">
      <Label className="text-sm">Output mapping</Label>
      <p className="text-xs text-muted-foreground">
        Map each output field to a source from upstream nodes.
      </p>
      <div className="flex flex-col gap-2">
        {outputVariables.map((item, index) => (
          <div className="flex items-center gap-1" key={item.key}>
            <span className="w-24 text-xs font-medium shrink-0">{item.key}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">({item.type})</span>
            <VariableSelect
              currentNodeId={data.id}
              onChange={(sel) => updateOutputVariable(index, { nodeId: sel.nodeId, path: sel.path })}
            >
              <div className="flex-1 min-w-0 w-full flex text-[10px] items-center gap-1 p-2.5 border border-input bg-background rounded-lg cursor-pointer">
                {item.isNotFound && item.nodeName ? (
                  <TriangleAlertIcon className="size-3 text-destructive" />
                ) : (
                  <VariableIcon className="size-3 text-blue-500" />
                )}
                <span>{item.nodeName ?? "—"}/</span>
                <span className="truncate min-w-0 text-blue-500 flex-1">
                  {item.path.length ? item.path.join(".") : "…"}
                </span>
                <ChevronDownIcon className="size-3 ml-auto" />
              </div>
            </VariableSelect>
          </div>
        ))}
      </div>
    </div>
  );
});
