"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type Connection,
  Panel,
  useReactFlow,
  OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { generateUUID } from "lib/utils";
import type {
  CustomNodeTypeDefinition,
  DesignerNode,
  DesignerEdge,
  DesignerSystemNode,
  DesignerGraphNode,
} from "app-types/custom-node-type";
import { isDesignerNode } from "app-types/custom-node-type";
import { DefaultNode } from "../default-node";
import { PythonScriptNode } from "../python-script-node";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { ArrowDownToLine, ArrowUpFromLine, Play, Save } from "lucide-react";
import { toast } from "sonner";
import { CanvasNodeSearch } from "../canvas-node-search";
import { createUINode } from "lib/ai/workflow/create-ui-node";
import { NodeKind, type UINode } from "lib/ai/workflow/workflow.interface";
import {
  convertDBNodeToUINode,
  convertUINodeToDBNode,
} from "lib/ai/workflow/shared.workflow";
import { SelectedNodeConfigTab } from "../selected-node-config-tab";
import type { DBNode } from "app-types/workflow";

const nodeTypes = {
  default: DefaultNode,
  "python-script": PythonScriptNode,
};

/** Convert legacy designer port to Workflow Input/Output node so user can set values like in Workflow. */
function designerNodeToUINode(d: DesignerNode): UINode {
  if (d.kind === "type-input") {
    return createUINode(NodeKind.Input, {
      id: d.id,
      name: d.name || "IN",
      position: d.position,
    });
  }
  return createUINode(NodeKind.Output, {
    id: d.id,
    name: d.name || "OUT",
    position: d.position,
  });
}

function designerSystemNodeToUINode(sn: DesignerSystemNode, typeId: string): UINode {
  const fake: DBNode = {
    ...sn,
    workflowId: typeId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as DBNode;
  return convertDBNodeToUINode(fake);
}

function uiNodeToDesignerSystemNode(ui: Node, typeId: string): DesignerSystemNode {
  const db = convertUINodeToDBNode(typeId, ui as UINode);
  return {
    id: db.id,
    kind: db.kind,
    name: db.name,
    description: db.description,
    nodeConfig: db.nodeConfig,
    uiConfig: db.uiConfig,
  };
}

interface DesignerCanvasProps {
  type: CustomNodeTypeDefinition;
  onSave: (
    nodes: DesignerGraphNode[],
    edges: DesignerEdge[],
    meta?: { name?: string; description?: string },
  ) => Promise<void>;
  onClose: () => void;
}

function DesignerCanvasInner({ type, onSave, onClose }: DesignerCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [name, setName] = useState(type.name ?? "");
  const [description, setDescription] = useState(type.description ?? "");

  const initialNodes = useMemo(() => {
    const list = type.nodes ?? [];
    return list.map((n) => {
      if (isDesignerNode(n)) {
        return designerNodeToUINode(n);
      }
      return designerSystemNodeToUINode(n as DesignerSystemNode, type.id);
    });
  }, [type.id, type.nodes]);

  const initialEdges = useMemo(
    () =>
      (type.edges ?? []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    [type.id, type.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(type.name ?? "");
    setDescription(type.description ?? "");
  }, [type.id, type.name, type.description]);
  const [runTestOpen, setRunTestOpen] = useState(false);
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [searchMenu, setSearchMenu] = useState<{ x: number; y: number; flowX: number; flowY: number } | null>(null);
  /** Node id for the config panel; stays open when clicking pane (does not follow React Flow selection). */
  const [configPanelNodeId, setConfigPanelNodeId] = useState<string | null>(null);

  const onConnect: OnConnect = useCallback(
    (conn) => setEdges((eds) => addEdge({ ...conn, id: generateUUID() }, eds)),
    [setEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (newConnection.source === newConnection.target) return;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges],
  );

  /** Drop edge endpoint on pane (not on a handle) → disconnect and remove edge, do not reconnect. */
  const onReconnectEnd = useCallback(
    (_evt: MouseEvent | TouchEvent, edge: Edge, _handleType: "source" | "target", connectionState: { toNode?: unknown }) => {
      if (connectionState.toNode == null) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    },
    [setEdges],
  );

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      const x = "clientX" in e ? e.clientX : 0;
      const y = "clientY" in e ? e.clientY : 0;
      const flowPos = screenToFlowPosition({ x, y });
      setSearchMenu({ x, y, flowX: flowPos.x, flowY: flowPos.y });
    },
    [screenToFlowPosition],
  );

  const handleNodeSearchSelect = useCallback(
    (kind: NodeKind, customNodeTypeId?: string, customLabel?: string) => {
      if (!searchMenu) return;
      const baseName = customLabel ?? kind.toUpperCase();
      const names = nodes.map((n) => (n.data as { name?: string })?.name ?? n.id).filter(Boolean);
      const count = names.filter((name) => name.startsWith(baseName)).length;
      const name = count > 0 ? `${baseName}_${count + 1}` : baseName;
      const newNode = createUINode(kind, {
        position: { x: searchMenu.flowX, y: searchMenu.flowY },
        name,
        customNodeTypeId,
      });
      setNodes((nds) => [...nds, newNode]);
      setSearchMenu(null);
    },
    [searchMenu, nodes, setNodes],
  );

  const addInput = useCallback(() => {
    const count = nodes.filter((n) => (n.data as { kind?: string })?.kind === NodeKind.Input).length;
    setNodes((nds) => [
      ...nds,
      createUINode(NodeKind.Input, {
        name: `IN[${count}]`,
        position: { x: 50, y: 80 + count * 60 },
      }),
    ]);
  }, [nodes, setNodes]);

  const addOutput = useCallback(() => {
    const count = nodes.filter((n) => (n.data as { kind?: string })?.kind === NodeKind.Output).length;
    setNodes((nds) => [
      ...nds,
      createUINode(NodeKind.Output, {
        name: count === 0 ? "OUT" : `OUT[${count}]`,
        position: { x: 400, y: 80 + count * 60 },
      }),
    ]);
  }, [nodes, setNodes]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const graphNodes: DesignerGraphNode[] = nodes.map((n) =>
        uiNodeToDesignerSystemNode(n, type.id),
      );
      const designerEdges: DesignerEdge[] = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      }));
      await onSave(graphNodes, designerEdges, {
        name: name.trim() || type.name,
        description: description.trim() || type.description || "",
      });
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, type.id, type.name, type.description, name, description, onSave]);

  const runTest = useCallback(async () => {
    setTestError(null);
    const inputNodeList = nodes.filter(
      (n) =>
        (n.data as { kind?: string })?.kind === NodeKind.Input ||
        (n.data as { kind?: string })?.kind === "type-input",
    );
    const query: Record<string, unknown> = {};
    inputNodeList.forEach((n) => {
      const v = testInputs[n.id];
      query[n.id] = v ?? "";
    });
    const graphNodes: DesignerGraphNode[] = nodes.map((n) =>
      uiNodeToDesignerSystemNode(n, type.id),
    );
    const designerEdges: DesignerEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
    }));
    try {
      const res = await fetch(`/api/custom-node-types/${type.id}/run-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, nodes: graphNodes, edges: designerEdges }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.error) {
        setTestError(data.error);
        setTestResult(null);
        toast.error(data.error);
        return;
      }
      if (!res.ok) {
        const msg = data.error || res.statusText || `HTTP ${res.status}`;
        setTestError(msg);
        setTestResult(null);
        toast.error(msg);
        return;
      }
      setTestResult(data.output ?? {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Run test failed";
      setTestError(msg);
      setTestResult(null);
      toast.error(msg);
    }
  }, [type.id, nodes, edges, testInputs]);

  const inputNodes = nodes.filter(
    (n) =>
      (n.data as { kind?: string })?.kind === NodeKind.Input ||
      (n.data as { kind?: string })?.kind === "type-input",
  );
  /** Config panel shows this node; persists when clicking pane until another node is selected or panel is closed. */
  const selectedNode = useMemo(() => {
    const id = configPanelNodeId;
    if (id) {
      const n = nodes.find((n) => n.id === id);
      return n ? (n as UINode) : undefined;
    }
    const sel = nodes.find((n) => n.selected);
    return sel ? (sel as UINode) : undefined;
  }, [nodes, configPanelNodeId]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setConfigPanelNodeId(node.id);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full gap-2">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type name"
            className="h-8 w-48 shrink-0 text-sm"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-8 min-w-0 flex-1 text-sm max-w-sm"
          />
          <div className="flex shrink-0 gap-1">
            <Button variant="outline" size="sm" onClick={addInput}>
              <ArrowDownToLine className="size-3.5" /> Add Input
            </Button>
            <Button variant="outline" size="sm" onClick={addOutput}>
              <ArrowUpFromLine className="size-3.5" /> Add Output
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="size-3.5" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setRunTestOpen((o) => !o)}>
              <Play className="size-3.5" /> Run test
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-[min(400px,50vh)] flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            onReconnectEnd={onReconnectEnd}
            edgesReconnectable
            onNodeClick={onNodeClick}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Delete", "Backspace"]}
          >
            <Background />
            <Controls />
            {runTestOpen && (
              <Panel position="top-right" className="z-10 max-w-sm rounded-lg border bg-card p-3 shadow-lg h-full">
                <div className="text-sm font-medium mb-2">Run test</div>
                <div className="space-y-2">
                  {inputNodes.map((n) => (
                    <div key={n.id}>
                      <label className="text-xs">{(n.data as { name?: string })?.name ?? n.id}</label>
                      <input
                        value={testInputs[n.id] ?? ""}
                        onChange={(e) => setTestInputs((t) => ({ ...t, [n.id]: e.target.value }))}
                        placeholder="value"
                        className="w-full h-8 text-xs border rounded px-2 mt-0.5"
                      />
                    </div>
                  ))}
                  <Button size="sm" onClick={runTest} className="w-full">
                    Run
                  </Button>
                  {testError && (
                    <div className="text-xs mt-2 p-2 bg-destructive/10 text-destructive rounded">
                      <div className="font-medium">Error</div>
                      <pre className="whitespace-pre-wrap break-words mt-1">{testError}</pre>
                    </div>
                  )}
                  {testResult != null && !testError && (
                    <div className="text-xs mt-2 p-2 bg-muted rounded">
                      <div className="font-medium">Output</div>
                      <pre className="whitespace-pre-wrap break-words mt-1">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
      {selectedNode && (
        <div className="w-80 shrink-0 overflow-auto rounded-lg border bg-card lg:w-96">
          <SelectedNodeConfigTab
            node={selectedNode}
            onClose={() => setConfigPanelNodeId(null)}
          />
        </div>
      )}
      <CanvasNodeSearch
        position={searchMenu ? { x: searchMenu.x, y: searchMenu.y } : null}
        onSelect={handleNodeSearchSelect}
        onClose={() => setSearchMenu(null)}
      />
    </div>
  );
}

export function DesignerCanvas(props: DesignerCanvasProps) {
  return (
    <ReactFlowProvider>
      <DesignerCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
