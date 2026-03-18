"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import type { CustomNodeTypeDefinition, DesignerGraphNode, DesignerEdge } from "app-types/custom-node-type";
import { DesignerCanvas } from "@/components/workflow/node-designer/designer-canvas";

export const dynamic = "force-dynamic";

export default function NodeDesignerGraphPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : null;
  const { data: type, error, isLoading, mutate } = useSWR<CustomNodeTypeDefinition>(
    id ? `/api/custom-node-types/${id}` : null,
    fetcher,
  );

  if (!id) return <p className="text-sm text-muted-foreground">Invalid ID</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load node type</p>;
  if (isLoading || !type) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const handleSave = async (
    nodes: DesignerGraphNode[],
    edges: DesignerEdge[],
    meta?: { name?: string; description?: string },
  ) => {
    const res = await fetch(`/api/custom-node-types/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes,
        edges,
        ...(meta?.name !== undefined && { name: meta.name }),
        ...(meta?.description !== undefined && { description: meta.description }),
      }),
    });
    if (!res.ok) throw new Error("Failed to save");
    mutate();
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Design graph
        </h2>
        <span className="text-sm font-medium">{type.name}</span>
      </div>
      <div className="min-h-[60vh] flex-1">
        <DesignerCanvas
          type={type}
          onSave={handleSave}
          onClose={() => router.push("/workflow/node-designer")}
        />
      </div>
    </section>
  );
}
