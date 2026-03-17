# workflow-AI

A standalone **AI Workflow Designer** built with Next.js 16, shadcn/ui, and Vercel AI SDK. Design, configure, and execute multi-step AI workflows visually using a drag-and-drop canvas.

---

## Screenshots

| Workflow List | Workflow Canvas |
|:---:|:---:|
| `/workflow` — manage your workflows | `/workflow/:id` — visual node editor |

---

## Features

- **Visual workflow canvas** powered by `@xyflow/react` (ReactFlow)
- **9 node types**: Input, Output, LLM, Condition, HTTP, Tool, Template, Code, Note
- **Real-time autosave** — debounced diff-based persistence
- **Variable mention system** — reference outputs from other nodes using `@mentions` (TipTap)
- **JSON Schema editor** — define typed output schemas per node
- **Condition branching** — if / else-if / else logic with AND/OR operators
- **Auto-layout** — BFS-based node arrangement
- **Cycle detection** — prevents invalid circular connections
- **Dark/light theme** — via `next-themes`
- **i18n ready** — via `next-intl`
- **Vercel AI SDK** integration-ready for LLM + Tool + HTTP execution

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1 (App Router, Turbopack) |
| UI Components | shadcn/ui (new-york style) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| Canvas | @xyflow/react (ReactFlow) |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/openai`) |
| State | Zustand (workflow store + app store) |
| Data Fetching | SWR |
| Rich Text | TipTap (mention + suggestion) |
| Validation | Zod |
| Animations | Framer Motion |
| Icons | Lucide React |
| Notifications | Sonner |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Installation

```bash
git clone https://github.com/nguyenngocdue/workflow-AI.git
cd workflow-AI
pnpm install
```

### Environment Variables

Create a `.env.local` file:

```bash
# Required for LLM execution
OPENAI_API_KEY=sk-...

# Internal API URL (used by Server Components)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/workflow`.

### Build for Production

```bash
pnpm build
pnpm start
```

---

## Project Structure

```
src/
├── app/
│   ├── (workflow)/
│   │   ├── workflow/page.tsx          # Workflow list
│   │   └── workflow/[id]/page.tsx     # Canvas editor
│   ├── api/workflow/                  # CRUD + structure + execute routes
│   ├── store/
│   │   ├── index.ts                   # appStore — chatModel (persisted)
│   │   └── workflow.store.ts          # useWorkflowStore — current workflow
│   └── globals.css
│
├── components/workflow/
│   ├── workflow.tsx                   # Root ReactFlow canvas
│   ├── workflow-panel.tsx             # Toolbar (save/run/publish/arrange)
│   ├── workflow-list-page.tsx         # /workflow list page
│   ├── default-node.tsx              # Universal node renderer
│   ├── selected-node-config-tab.tsx   # Right-side config panel
│   ├── execute-tab.tsx                # Test run panel
│   └── node-config/                   # Per-kind config UIs
│       ├── input-node-config.tsx
│       ├── llm-node-config.tsx
│       ├── condition-node-config.tsx
│       ├── http-node-config.tsx
│       ├── tool-node-config.tsx
│       └── template-node-config.tsx
│
├── lib/ai/workflow/
│   ├── workflow.interface.ts          # NodeKind, UINode, all types
│   ├── shared.workflow.ts             # DB↔UI converters, stream encoding
│   ├── create-ui-node.ts              # Node factory
│   ├── node-validate.ts               # Pre-run validation
│   ├── condition.ts                   # Condition operators + evaluator
│   ├── arrange-nodes.ts               # Auto-layout algorithm
│   └── executor/                      # Execution engine
│       ├── graph-store.ts             # Runtime I/O state
│       ├── node-executor.ts           # Per-kind executors
│       └── workflow-executor.ts       # DAG traversal
│
└── types/
    ├── workflow.ts                    # DBWorkflow, DBNode, DBEdge
    └── util.ts                        # ObjectJsonSchema7, TipTapMentionJsonContent
```

---

## Node Types

| Node | Icon | Description |
|------|------|-------------|
| **Input** | `→` | Workflow entry point — defines input schema |
| **Output** | `←` | Collects and maps results from other nodes |
| **LLM** | `✦` | Calls an AI model (GPT-4o, etc.) with configurable messages |
| **Condition** | `?` | Branches flow with if / else-if / else logic |
| **HTTP** | `🌐` | Makes external API calls (GET, POST, PUT, DELETE…) |
| **Tool** | `🔧` | Runs an AI tool call (function calling) |
| **Template** | `📄` | Generates text using variable interpolation |
| **Note** | `📝` | Sticky note / comment (no execution) |
| **Code** | `</>` | Code execution *(coming soon)* |

---

## Architecture

### Save Flow

```
User edits node/edge
  → debounce (200ms on add/delete, 10s on move)
  → extractWorkflowDiff() — compute minimal diff
  → POST /api/workflow/:id/structure
    { nodes: DBNode[], edges: DBEdge[], deleteNodes: [], deleteEdges: [] }
```

### Execution Flow

```
ExecuteTab → POST /api/workflow/:id/execute
  → ReadableStream of "WF_EVENT:{json}\n" lines
  → WORKFLOW_START | NODE_START | NODE_END | WORKFLOW_END
  → UI updates node colors: grey → spinner → green/red
```

### Path Aliases

```json
"@/*"          → "src/*"
"lib/*"        → "src/lib/*"
"app-types/*"  → "src/types/*"
"ui/*"         → "src/components/ui/*"
"auth/*"       → "src/lib/auth/*"
```

---

## Implementing Execution (Vercel AI SDK)

The `/api/workflow/[id]/execute` route is **not yet implemented**. To enable real execution:

```typescript
// src/app/api/workflow/[id]/execute/route.ts
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { encodeWorkflowEvent } from 'lib/ai/workflow/shared.workflow';

export async function POST(req: Request, { params }) {
  const { id } = await params;
  const { query } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e) => controller.enqueue(encoder.encode(encodeWorkflowEvent(e)));

      send({ type: 'WORKFLOW_START', workflowId: id, timestamp: Date.now() });
      // ... walk DAG, execute nodes, emit events ...
      send({ type: 'WORKFLOW_END', workflowId: id, result: {}, timestamp: Date.now() });
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

## Mock / Stub Services

This project runs fully in-memory for development. The following are stubbed:

| Service | Stub location | Notes |
|---------|--------------|-------|
| Auth | `src/lib/auth/client.ts` | Always returns mock user |
| Database | `src/app/api/workflow/route.ts` | In-memory array |
| Workflow execution | `src/lib/ai/workflow/executor/` | Throws "not available" |
| MCP tools | `src/hooks/queries/use-mcp-list.ts` | Returns `[]` |

