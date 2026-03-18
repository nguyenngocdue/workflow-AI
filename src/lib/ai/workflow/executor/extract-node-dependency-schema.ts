import { ObjectJsonSchema7 } from "app-types/util";
import { NodeKind, WorkflowNodeData } from "../workflow.interface";
import {
  defaultObjectJsonSchema,
  findJsonSchemaByPath,
} from "../shared.workflow";
import { JSONSchema7 } from "json-schema";

export function extractNodeDependencySchema({
  targetId,
  nodes,
}: {
  targetId: string;
  nodes: WorkflowNodeData[];
}): ObjectJsonSchema7 {
  const schema = structuredClone(defaultObjectJsonSchema);
  const target = nodes.find((node) => node.id === targetId);
  if (!target) {
    return schema;
  }

  if (target.kind === NodeKind.Input) {
    return target.outputSchema;
  }
  if (target.kind === NodeKind.PythonScript) {
    return target.outputSchema;
  }
  if (target.kind === NodeKind.Output || target.kind === NodeKind.Custom) {
    const outputData = (target as any).outputData ?? [];
    const properties = outputData.reduce(
      (acc: Record<string, JSONSchema7>, cur: { key: string; source?: { nodeId: string; path: string[] } }) => {
        if (!cur.key) return acc;
        acc[cur.key] = { type: "string" };
        const source = cur.source;
        if (!source) return acc;
        const sourceNode = nodes.find((node) => node.id === source.nodeId);
        if (!sourceNode) return acc;
        const sourceSchema = findJsonSchemaByPath(
          sourceNode.outputSchema,
          source.path,
        );
        acc[cur.key] = sourceSchema || { type: "string" };
        return acc;
      },
      {},
    );
    schema.properties = properties;
    return schema;
  }

  return schema;
}
