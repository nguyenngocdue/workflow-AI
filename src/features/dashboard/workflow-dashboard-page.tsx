"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAndStoreWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  formatWorkflowDate,
  loadWorkflowRecords,
  type WorkflowRecord,
} from "@/src/infrastructure/workflow-library";

const VISIBILITY_TW: Record<string, string> = {
  private:  "bg-[rgba(15,118,110,0.12)] text-[#0f766e]",
  public:   "bg-[rgba(37,99,235,0.12)] text-[#2563eb]",
  readonly: "bg-[rgba(124,58,237,0.12)] text-[#7c3aed]",
};

const PILL = "inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--stroke)] whitespace-nowrap";
const BTN  = "border border-[var(--stroke-strong)] bg-[var(--surface-strong)] text-[var(--text)] px-[14px] py-[10px] rounded-[var(--radius-sm)] transition-[transform,border-color,background] duration-[120ms] hover:-translate-y-px hover:border-[rgba(20,33,61,0.32)]";
const BTN_PRIMARY = "border border-[rgba(221,107,32,0.32)] [background:linear-gradient(180deg,#ef8f45_0%,#dd6b20_100%)] text-white px-[14px] py-[10px] rounded-[var(--radius-sm)] transition-[transform,border-color,background] duration-[120ms] hover:-translate-y-px";
const BTN_SUBTLE  = `${BTN} bg-white/[.48]`;

export function WorkflowDashboardPage() {
  const router = useRouter();
  const [records, setRecords] = useState<WorkflowRecord[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setRecords(loadWorkflowRecords());
  }, []);

  const filteredRecords = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    if (!term) {
      return records;
    }
    return records.filter((record) => {
      return (
        record.name.toLowerCase().includes(term) ||
        record.description.toLowerCase().includes(term) ||
        record.visibility.toLowerCase().includes(term)
      );
    });
  }, [deferredQuery, records]);

  function refreshRecords() {
    setRecords(loadWorkflowRecords());
  }

  function handleCreateWorkflow() {
    startTransition(() => {
      const record = createAndStoreWorkflow();
      refreshRecords();
      router.push(`/workflows/${record.id}`);
    });
  }

  function handleDuplicateWorkflow(workflowId: string) {
    startTransition(() => {
      const copy = duplicateWorkflow(workflowId);
      if (!copy) {
        return;
      }
      refreshRecords();
      router.push(`/workflows/${copy.id}`);
    });
  }

  function handleDeleteWorkflow(workflowId: string) {
    startTransition(() => {
      deleteWorkflow(workflowId);
      refreshRecords();
    });
  }

  return (
    <main className="mx-auto pt-10 pb-[72px] [width:min(1360px,calc(100vw-32px))]">
      <section className="grid gap-3 mb-7">
        <span className="w-fit px-[14px] py-2 rounded-full border border-[var(--stroke)] bg-white/[.62] text-[var(--muted)] text-[12px] tracking-[0.08em] uppercase">chatbot-workflow / dashboard</span>
        <h1>Workflow Dashboard</h1>
        <p>
          Danh sách workflow của host app. Từ đây bạn có thể tạo workflow mới,
          mở designer page, duplicate hoặc xóa workflow cục bộ trước khi nối qua
          backend thật.
        </p>
      </section>

      <section className="panel relative overflow-hidden border border-[var(--stroke)] rounded-[var(--radius-xl)] bg-[var(--surface)] shadow-[var(--shadow)] backdrop-blur-[18px]">
        <div className="relative z-[1] p-[22px]">
          <div className="flex justify-between items-start gap-4 mb-[18px]">
            <div>
              <h2 className="m-0 text-[1.15rem] tracking-[-0.03em]">Library</h2>
              <p className="mt-[6px] mb-0 text-[var(--muted)] text-[0.95rem] leading-[1.55]">
                Mỗi item đại diện cho một workflow record mà app khác sau này có
                thể đọc để build agent.
              </p>
            </div>
            <div className="flex flex-wrap gap-[10px]">
              <input
                className="w-full min-h-[44px] border border-[var(--stroke)] rounded-[var(--radius-sm)] bg-[rgba(255,250,240,0.88)] px-3 py-[10px] text-[var(--surface-contrast)] min-w-[260px]"
                placeholder="Search workflows"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className={BTN_PRIMARY} type="button" onClick={handleCreateWorkflow}>
                New Workflow
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-[10px]">
            <div className="p-[14px] rounded-[var(--radius-md)] bg-white/[.58] border border-[var(--stroke)]">
              <p className="m-0 mb-[6px] text-[var(--muted)] text-[0.82rem]">Total</p>
              <p className="m-0 text-[1.25rem] tracking-[-0.04em]">{records.length}</p>
            </div>
            <div className="p-[14px] rounded-[var(--radius-md)] bg-white/[.58] border border-[var(--stroke)]">
              <p className="m-0 mb-[6px] text-[var(--muted)] text-[0.82rem]">Filtered</p>
              <p className="m-0 text-[1.25rem] tracking-[-0.04em]">{filteredRecords.length}</p>
            </div>
            <div className="p-[14px] rounded-[var(--radius-md)] bg-white/[.58] border border-[var(--stroke)]">
              <p className="m-0 mb-[6px] text-[var(--muted)] text-[0.82rem]">Private</p>
              <p className="m-0 text-[1.25rem] tracking-[-0.04em]">
                {records.filter((record) => record.visibility === "private").length}
              </p>
            </div>
            <div className="p-[14px] rounded-[var(--radius-md)] bg-white/[.58] border border-[var(--stroke)]">
              <p className="m-0 mb-[6px] text-[var(--muted)] text-[0.82rem]">Public/Readonly</p>
              <p className="m-0 text-[1.25rem] tracking-[-0.04em]">
                {
                  records.filter(
                    (record) => record.visibility === "public" || record.visibility === "readonly",
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[14px] mt-[18px]">
            {filteredRecords.map((record) => (
              <article
                className="grid gap-[14px] p-[18px] rounded-[var(--radius-lg)] border border-[var(--stroke)] [background:linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,250,240,0.78))]"
                key={record.id}
              >
                <div className="flex justify-between gap-4 items-start">
                  <div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`${PILL} ${VISIBILITY_TW[record.visibility] ?? "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>{record.visibility}</span>
                      <span className={`${PILL} ${record.isPublished ? "bg-[rgba(31,122,77,0.1)] text-[var(--ok)] border-transparent" : "bg-[var(--surface-strong)] text-[var(--muted)]"}`}>
                        {record.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <h3 className="mt-[10px] mb-0 text-[1.2rem] tracking-[-0.03em]">
                      {record.icon && <span className="mr-2">{record.icon}</span>}
                      {record.name}
                    </h3>
                  </div>
                  <small className="text-[var(--muted)]">{formatWorkflowDate(record.updatedAt)}</small>
                </div>

                <p className="m-0 text-[var(--muted)] leading-[1.6]">{record.description}</p>

                <div className="flex flex-wrap gap-[10px]">
                  <span className="inline-flex items-center gap-[6px] rounded-full py-[7px] px-[11px] bg-[var(--accent-soft)] text-[#9a3412]">{record.flow.nodes.length} nodes</span>
                  <span className="inline-flex items-center gap-[6px] rounded-full py-[7px] px-[11px] bg-[var(--accent-soft)] text-[#9a3412]">{record.flow.edges.length} edges</span>
                </div>

                <div className="flex flex-wrap gap-[10px]">
                  <Link className={BTN_PRIMARY} href={`/workflows/${record.id}`}>
                    Open Designer
                  </Link>
                  <button
                    className={BTN_SUBTLE}
                    type="button"
                    onClick={() => handleDuplicateWorkflow(record.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    className={BTN_SUBTLE}
                    type="button"
                    onClick={() => handleDeleteWorkflow(record.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!filteredRecords.length && (
            <div className="mt-[14px] px-[14px] py-3 rounded-[var(--radius-md)] border border-[var(--stroke)] bg-white/[.58] text-[var(--muted)]">
              No workflows match the current filter. Clear the search box or create a
              new workflow.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
