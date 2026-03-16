"use client";

import { useEffect, useState } from "react";

type EditWorkflowDialogProps = {
  open: boolean;
  defaultValues?: {
    name: string;
    description: string;
    icon?: string;
    iconColor?: string;
  };
  onSave: (values: {
    name: string;
    description: string;
    icon: string;
    iconColor: string;
  }) => void;
  onClose: () => void;
};

const PRESET_COLORS = [
  "#dd6b20",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#dc2626",
  "#ca8a04",
  "#0284c7",
  "#64748b",
];

export function EditWorkflowDialog({
  open,
  defaultValues,
  onSave,
  onClose,
}: EditWorkflowDialogProps) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(
    defaultValues?.description ?? "",
  );
  const [icon, setIcon] = useState(defaultValues?.icon ?? "");
  const [iconColor, setIconColor] = useState(
    defaultValues?.iconColor ?? "#dd6b20",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && defaultValues) {
      setName(defaultValues.name);
      setDescription(defaultValues.description);
      setIcon(defaultValues.icon ?? "");
      setIconColor(defaultValues.iconColor ?? "#dd6b20");
      setError("");
    }
  }, [open, defaultValues]);

  if (!open) {
    return null;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Workflow name is required.");
      return;
    }
    if (trimmedName.length > 20) {
      setError("Name must be 20 characters or less.");
      return;
    }
    onSave({
      name: trimmedName,
      description: description.trim(),
      icon,
      iconColor,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[rgba(20,33,61,0.32)] backdrop-blur-[4px]" onClick={onClose}>
      <div
        className="[width:min(520px,calc(100vw-40px))] p-6 rounded-[var(--radius-xl)] border border-[var(--stroke)] bg-[var(--surface-strong)] shadow-[0_32px_80px_rgba(20,33,61,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="m-0 mb-[18px] text-[1.25rem] tracking-[-0.03em]">Edit Workflow</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--muted)]" htmlFor="dialog-name">
                Workflow Name
              </label>
              <input
                id="dialog-name"
                className="w-full min-h-[44px] border border-[var(--stroke)] rounded-[var(--radius-sm)] bg-[rgba(255,250,240,0.88)] px-3 py-[10px] text-[var(--surface-contrast)]"
                value={name}
                maxLength={20}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--muted)]" htmlFor="dialog-icon">
                  Icon (emoji)
                </label>
                <input
                  id="dialog-icon"
                  className="w-full min-h-[44px] border border-[var(--stroke)] rounded-[var(--radius-sm)] bg-[rgba(255,250,240,0.88)] px-3 py-[10px] text-[var(--surface-contrast)]"
                  value={icon}
                  placeholder="\u{1F916}"
                  maxLength={4}
                  onChange={(event) => setIcon(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--muted)]">Icon Color</label>
                <div className="flex gap-[6px] flex-wrap items-center">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-[30px] h-[30px] rounded-[8px] cursor-pointer"
                      style={{
                        border: color === iconColor ? "2px solid var(--text)" : "1px solid var(--stroke)",
                        background: color,
                      }}
                      onClick={() => setIconColor(color)}
                    />
                  ))}
                  <input
                    type="color"
                    value={iconColor}
                    onChange={(event) => setIconColor(event.target.value)}
                    className="w-[30px] h-[30px] border-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-[0.8rem] font-bold tracking-[0.08em] uppercase text-[var(--muted)]" htmlFor="dialog-description">
                Description
              </label>
              <textarea
                id="dialog-description"
                className="w-full min-h-[156px] border border-[var(--stroke)] rounded-[var(--radius-lg)] bg-[rgba(255,250,240,0.88)] px-4 py-[14px] text-[var(--surface-contrast)] resize-y"
                value={description}
                maxLength={200}
                onChange={(event) => setDescription(event.target.value)}
              />
              <span className="text-[var(--muted)] text-[0.78rem]">
                {description.length}/200
              </span>
            </div>

            {error && (
              <div className="grid gap-2 p-[14px] rounded-[16px] border border-[rgba(180,35,24,0.18)] bg-[rgba(180,35,24,0.06)]">
                <div className="text-[var(--error)] text-[0.92rem] leading-[1.45]">{error}</div>
              </div>
            )}
          </div>

          <div className="flex gap-[10px] justify-end mt-[18px]">
            <button
              className="border border-[var(--stroke-strong)] bg-white/[.48] text-[var(--text)] px-[14px] py-[10px] rounded-[var(--radius-sm)] transition-[transform,border-color,background] duration-[120ms] hover:-translate-y-px hover:border-[rgba(20,33,61,0.32)]"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="border border-[rgba(221,107,32,0.32)] [background:linear-gradient(180deg,#ef8f45_0%,#dd6b20_100%)] text-white px-[14px] py-[10px] rounded-[var(--radius-sm)] transition-[transform,border-color,background] duration-[120ms] hover:-translate-y-px"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
