"use client";

import { useState } from "react";
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
import { toast } from "sonner";

interface NewNodeTypeGraphDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}

export function NewNodeTypeGraphDialog({
  open,
  onOpenChange,
  onCreated,
}: NewNodeTypeGraphDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/custom-node-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          outputSchema: [],
          nodes: [],
          edges: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const created = await res.json();
      toast.success("Created. Opening graph.");
      setName("");
      setDescription("");
      onOpenChange(false);
      onCreated?.(created.id);
    } catch {
      toast.error("Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setName("");
      setDescription("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New node type (graph)</DialogTitle>
          <DialogDescription>
            Create an empty node type and design the graph (inputs, processing, outputs) in the
            canvas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Script"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this node does"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating…" : "Create and open graph"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
