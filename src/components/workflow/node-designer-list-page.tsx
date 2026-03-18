"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { fetcher } from "lib/utils";
import type { CustomNodeTypeDefinition, CustomNodeTypeField } from "app-types/custom-node-type";
import { Button } from "ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Plus, Pencil, Trash2, Box, Workflow, FileCode, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { DESIGNER_TEMPLATE } from "lib/mock/designer-template";
import { NewNodeTypeFormDialog } from "./new-node-type-form-dialog";
import { NewNodeTypeGraphDialog } from "./new-node-type-graph-dialog";

export function NodeDesignerListPage() {
  const router = useRouter();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [graphDialogOpen, setGraphDialogOpen] = useState(false);
  const { data: types = [], mutate } = useSWR<CustomNodeTypeDefinition[]>(
    "/api/custom-node-types",
    fetcher,
  );

  const deleteType = async (id: string) => {
    if (!confirm("Delete this node type? It may break workflows using it.")) return;
    try {
      const res = await fetch(`/api/custom-node-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Deleted");
      mutate();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const createFromTemplate = async () => {
    try {
      const res = await fetch("/api/custom-node-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: DESIGNER_TEMPLATE.name,
          description: DESIGNER_TEMPLATE.description,
          nodes: DESIGNER_TEMPLATE.nodes,
          edges: DESIGNER_TEMPLATE.edges,
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = await res.json();
      mutate();
      router.push(`/workflow/node-designer/${created.id}`);
      toast.success("Template created. Design your graph.");
    } catch {
      toast.error("Failed to create template");
    }
  };

  return (
    <>
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Quick start
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={createFromTemplate} className="gap-2">
            <FileCode className="size-4" /> Template: Input → Python → Output
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => setFormDialogOpen(true)}
          >
            <Plus className="size-4" /> New (form)
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setGraphDialogOpen(true)}
          >
            <Workflow className="size-4" /> New (graph)
          </Button>
        </div>
        <NewNodeTypeFormDialog
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
          onSuccess={() => mutate()}
        />
        <NewNodeTypeGraphDialog
          open={graphDialogOpen}
          onOpenChange={setGraphDialogOpen}
          onCreated={(id) => {
            mutate();
            router.push(`/workflow/node-designer/${id}`);
          }}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Use the template for a ready flow, or create from form (output schema first) or start with an empty graph.
        </p>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          <LayoutGrid className="size-4" /> Your node types
        </h2>
        {types.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Box className="mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No custom node types yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create one above to use in workflows.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((t) => {
              const inputCount =
                t.nodes?.filter((n) => n.kind === "type-input" || n.kind === "input").length ?? 0;
              const outputCount =
                t.nodes?.filter((n) => n.kind === "type-output" || n.kind === "output").length ?? 0;
              const hasGraph = (t.nodes?.length ?? 0) > 0;
              return (
                <li key={t.id}>
                  <Card className="flex h-full flex-col transition-colors hover:border-primary/30">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base">{t.name}</CardTitle>
                        {t.description && (
                          <CardDescription className="mt-0.5 line-clamp-2 text-xs">
                            {t.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        <Link href={`/workflow/node-designer/${t.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Edit (form)"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </Link>
                        <Link href={`/workflow/node-designer/${t.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Design graph"
                          >
                            <Workflow className="size-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteType(t.id)}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto pt-0">
                      <div className="rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                        {hasGraph ? (
                          <>Graph: {inputCount} in → {outputCount} out</>
                        ) : (
                          <>
                            Outputs:{" "}
                            {t.outputSchema
                              .map((f: CustomNodeTypeField) => `${f.key} (${f.type})`)
                              .join(", ") || "—"}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
