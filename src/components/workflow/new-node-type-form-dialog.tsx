"use client";

import { useState, useCallback } from "react";
import type { CustomNodeTypeField } from "app-types/custom-node-type";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const OUTPUT_TYPES = ["string", "number", "boolean", "object", "array"] as const;

interface NewNodeTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewNodeTypeFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewNodeTypeFormDialogProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    outputSchema: [] as CustomNodeTypeField[],
  });
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const outputSchema = form.outputSchema.filter((f) => f.key.trim());
    if (outputSchema.length === 0) {
      toast.error("Add at least one output field");
      return;
    }
    setSaving(true);
    try {
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
      toast.success("Node type created");
      setForm({ name: "", description: "", outputSchema: [] });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) setForm({ name: "", description: "", outputSchema: [] });
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New node type (form)</DialogTitle>
          <DialogDescription>
            Define name, description and output fields. You can map fields to the graph later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sum, Formatter"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Description (optional)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this node does"
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Output fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOutputField}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {form.outputSchema.map((field, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
                >
                  <Input
                    value={field.key}
                    onChange={(e) => updateOutputField(index, { key: e.target.value })}
                    placeholder="key"
                    className="h-8 w-28 text-sm"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
