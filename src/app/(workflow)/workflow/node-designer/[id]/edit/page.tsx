"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import type { CustomNodeTypeDefinition } from "app-types/custom-node-type";
import { NodeDesignerForm } from "@/components/workflow/node-designer-form";

export const dynamic = "force-dynamic";

export default function NodeDesignerEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;
  const { data: type, error, isLoading } = useSWR<CustomNodeTypeDefinition>(
    id ? `/api/custom-node-types/${id}` : null,
    fetcher,
  );

  if (!id) return <p className="text-sm text-muted-foreground">Invalid ID</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load node type</p>;
  if (isLoading || !type) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return <NodeDesignerForm mode="edit" type={type} />;
}
