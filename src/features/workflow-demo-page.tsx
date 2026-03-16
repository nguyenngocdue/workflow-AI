"use client";

import { useMemo, useState } from "react";
import { WorkflowProvider } from "@/src/workflow-provider";
import { WorkflowStudio } from "@/src/features/workflow-studio";
import { createSupportWorkflow } from "@/src/examples/support-workflow";

export function WorkflowDemoPage() {
  const initialFlow = useMemo(() => createSupportWorkflow(), []);
  const [savedAt, setSavedAt] = useState<string>("not saved yet");

  return (
    <main className="mx-auto pt-10 pb-[72px] [width:min(1360px,calc(100vw-32px))]">
      <section className="grid gap-3 mb-7">
        <span className="w-fit px-[14px] py-2 rounded-full border border-[var(--stroke)] bg-white/[.62] text-[var(--muted)] text-[12px] tracking-[0.08em] uppercase">chatbot-workflow / next host</span>
        <h1>Workflow package scaffolded for downstream agent apps.</h1>
        <p>
          Kiến trúc lấy từ mô hình package-first của Flowise, còn semantics của
          workflow giữ theo better-chatbot. Dự án này đang đóng vai trò host Next.js
          để phát triển và smoke-test package core trước khi build npm package thật.
        </p>
        <p className="text-[var(--muted)]">
          Current save callback state: <strong>{savedAt}</strong>
        </p>
      </section>

      <WorkflowProvider
        initialFlow={initialFlow}
        onFlowChange={() => {
          setSavedAt(new Date().toLocaleTimeString());
        }}
      >
        <WorkflowStudio />
      </WorkflowProvider>
    </main>
  );
}
