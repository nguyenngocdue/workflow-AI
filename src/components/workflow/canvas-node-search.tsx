"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NodeKind } from "lib/ai/workflow/workflow.interface";
import { NodeIcon } from "./node-icon";
import { cn } from "lib/utils";

const NODE_OPTIONS: {
  kind: NodeKind;
  label: string;
  description: string;
  keywords: string[];
}[] = [
  {
    kind: NodeKind.Input,
    label: "Input",
    description: "Workflow entry point, defines input schema",
    keywords: ["input", "start", "entry", "begin"],
  },
  {
    kind: NodeKind.LLM,
    label: "LLM",
    description: "Call an AI model (GPT-4o, Claude…)",
    keywords: ["llm", "ai", "gpt", "model", "language", "openai", "claude"],
  },
  {
    kind: NodeKind.Condition,
    label: "Condition",
    description: "Branch with if / else-if / else logic",
    keywords: ["condition", "if", "else", "branch", "switch", "logic"],
  },
  {
    kind: NodeKind.Http,
    label: "HTTP",
    description: "Make an external API call",
    keywords: ["http", "api", "request", "fetch", "rest", "get", "post"],
  },
  {
    kind: NodeKind.Tool,
    label: "Tool",
    description: "Run an AI tool / function call",
    keywords: ["tool", "function", "call", "plugin"],
  },
  {
    kind: NodeKind.Template,
    label: "Template",
    description: "Generate text with variable mentions",
    keywords: ["template", "text", "prompt", "string", "format"],
  },
  {
    kind: NodeKind.Note,
    label: "Note",
    description: "Add a sticky note or comment",
    keywords: ["note", "comment", "sticky", "memo"],
  },
  {
    kind: NodeKind.Output,
    label: "Output",
    description: "Collect and map final results",
    keywords: ["output", "result", "end", "final"],
  },
  {
    kind: NodeKind.Code,
    label: "Code",
    description: "Execute a code block",
    keywords: ["code", "script", "execute", "run", "javascript", "python"],
  },
];

interface CanvasNodeSearchProps {
  position: { x: number; y: number } | null;
  onSelect: (kind: NodeKind) => void;
  onClose: () => void;
}

export function CanvasNodeSearch({
  position,
  onSelect,
  onClose,
}: CanvasNodeSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = NODE_OPTIONS.filter((opt) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.description.toLowerCase().includes(q) ||
      opt.keywords.some((k) => k.includes(q))
    );
  });

  // Auto-focus input when opened
  useEffect(() => {
    if (position) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [position]);

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    if (!position) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [position, onClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        onSelect(filtered[activeIndex].kind);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!position) return null;

  // Adjust popup position to stay within viewport
  const popupWidth = 280;
  const popupMaxHeight = 380;
  const x = Math.min(position.x, window.innerWidth - popupWidth - 16);
  const y = Math.min(position.y, window.innerHeight - popupMaxHeight - 16);

  const popup = (
    <div
      ref={containerRef}
      className="fixed z-[9999] rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
      style={{ left: x, top: y, width: popupWidth }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <svg
          className="size-3.5 text-muted-foreground shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search nodes..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
          ESC
        </kbd>
      </div>

      {/* Node list */}
      <div className="overflow-y-auto max-h-72 p-1">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            No nodes found
          </p>
        ) : (
          filtered.map((opt, i) => (
            <button
              key={opt.kind}
              className={cn(
                "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors",
                i === activeIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50",
              )}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => onSelect(opt.kind)}
            >
              <NodeIcon type={opt.kind} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium leading-tight">
                  {opt.label}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {opt.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      {filtered.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">ESC</kbd> close</span>
        </div>
      )}
    </div>
  );

  return createPortal(popup, document.body);
}
