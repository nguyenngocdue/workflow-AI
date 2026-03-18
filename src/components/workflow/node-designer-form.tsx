"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  CustomNodeTypeDefinition,
  CustomNodeTypeField,
} from "app-types/custom-node-type";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const OUTPUT_TYPES = ["string", "number", "boolean", "object", "array"] as const;

type NodeDesignerFormProps =
  | { mode: "create" }
  | { mode: "edit"; type: CustomNodeTypeDefinition };

export function NodeDesignerForm(props: NodeDesignerFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit
    ? {
        name: props.type.name,
        description: props.type.description ?? "",
        outputSchema: props.type.outputSchema.map((f) => ({ ...f })),
      }
    : { name: "", description: "", outputSchema: [] as CustomNodeTypeField[] };

  const [form, setForm] = useState(initial);

  const addOutputField = useCallback(() => {
    setForm((f) => ({
      ...f,
      outputSchema: [...f.outputSchema, { key: "", type: "string" }],
    }));
  }, []);

  const updateOutputField = useCallback((index: number, field: Partial<CustomNodeTypeField>) => {
    setForm((f) => ({
      ...f,
      outputSchema: f.outputSchema.map((o, i) => (i === index ? { ...o, ...field } : o)),
    }));
  }, []);

  const removeOutputField = useCallback((index: number) => {
    setForm((f) => ({
      ...f,
      outputSchema: f.outputSchema.filter((_, i) => i !== index),
    }));
  }, []);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const outputSchema = form.outputSchema.filter((f) => f.key.trim());
    if (outputSchema.length === 0) {
      toast.error("Add at least one output field");
      return;
    }
    try {
      if (isEdit) {
        const res = await fetch(`/api/custom-node-types/${props.type.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            outputSchema,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Node type updated");
        router.push("/workflow/node-designer");
      } else {
        const res = await fetch("/api/custom-node-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            outputSchema,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        toast.success("Node type created");
        router.push(`/workflow/node-designer/${created.id}`);
      }
    } catch {
      toast.error("Failed to save");
    }
  };

  return (
    <section className="max-w-2xl">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {isEdit ? "Edit node type" : "New node type (form)"}
          </CardTitle>
          <CardDescription>
            Output fields define what this node exposes. Map each field to a source in the graph
            later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sum, Formatter"
              />
            </div>
            <div className="space-y-2 sm:col-span-2 sm:max-w-lg">
              <Label className="text-xs font-medium">Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What this node does"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Output fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOutputField}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {form.outputSchema.map((field, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <Input
                    value={field.key}
                    onChange={(e) => updateOutputField(index, { key: e.target.value })}
                    placeholder="key"
                    className="h-8 w-32 text-sm"
                  />
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateOutputField(index, {
                        type: e.target.value as CustomNodeTypeField["type"],
                      })
                    }
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    {OUTPUT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeOutputField(index)}
                  >
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={save}>Save</Button>
            <Button variant="outline" asChild>
              <Link href="/workflow/node-designer">Cancel</Link>
            </Button>
            {isEdit && (
              <Button variant="secondary" asChild className="ml-auto">
                <Link href={`/workflow/node-designer/${props.type.id}`}>Design graph</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
