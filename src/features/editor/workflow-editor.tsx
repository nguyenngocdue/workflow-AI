"use client";

import {
  Background,
  Controls,
  Panel,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type IsValidConnection,
  type NodeChange,
  type NodeMouseHandler,
  type OnConnect,
  type OnSelectionChangeFunc,
  type ReactFlowInstance,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arrangeNodes } from "@/src/core/layout";
import {
  NodeKind,
  type WorkflowExecutionResult,
  type WorkflowNode,
  type WorkflowNodeHistory,
} from "@/src/core/types";
import { useWorkflow } from "@/src/use-workflow";
import { WorkflowCanvasNode } from "@/src/features/editor/workflow-canvas-node";
import { WorkflowNodeInspector } from "@/src/features/editor/workflow-node-inspector";
import { WorkflowRunPanel } from "@/src/features/editor/workflow-run-panel";
import {
  addEdgeToFlow,
  createDefaultNode,
  getNodeKindLabel,
  getSupportedDesignerKinds,
  removeNodeFromFlow,
  updateNodeDataInFlow,
} from "@/src/features/editor/workflow-editor-utils";
import {
  areCanvasAndWorkflowEqual,
  extractWorkflowFromCanvas,
  getAppendSource,
  isConnectionAllowed,
  toCanvasEdges,
  toCanvasNodes,
  type CanvasEdge,
  type CanvasNode,
  type RuntimeStatus,
} from "@/src/features/editor/workflow-reactflow";
import { WorkflowGreeting } from "@/src/features/editor/workflow-greeting";

const nodeTypes = {
  workflow: WorkflowCanvasNode,
};

type WorkflowEditorProps = {
  inputText: string;
  isRunning: boolean;
  notice?: string;
  runtimeResult?: WorkflowExecutionResult;
  runtimeHistories: WorkflowNodeHistory[];
  runtimeNodeStatuses: Record<string, RuntimeStatus | undefined>;
  onInputTextChange: (value: string) => void;
  onRun: () => void;
  onClearRuntime: () => void;
  onNotice?: (message: string) => void;
};

export function WorkflowEditor({
  inputText,
  isRunning,
  notice,
  runtimeResult,
  runtimeHistories,
  runtimeNodeStatuses,
  onInputTextChange,
  onRun,
  onClearRuntime,
  onNotice,
}: WorkflowEditorProps) {
  const workflow = useWorkflow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    workflow.flow.nodes[0]?.id,
  );
  const [activeNodeIds, setActiveNodeIds] = useState<string[]>([]);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdge[]>([]);
  const [panelTab, setPanelTab] = useState<"config" | "run">("config");
  const [reactFlow, setReactFlow] = useState<
    ReactFlowInstance<CanvasNode, CanvasEdge> | null
  >(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const validation = useMemo(() => workflow.validate(), [workflow.flow, workflow]);

  useEffect(() => {
    if (!selectedNodeId && workflow.flow.nodes.length > 0) {
      setSelectedNodeId(workflow.flow.nodes[0]?.id);
      return;
    }

    if (
      selectedNodeId &&
      !workflow.flow.nodes.some((node) => node.id === selectedNodeId)
    ) {
      setSelectedNodeId(workflow.flow.nodes[0]?.id);
    }
  }, [selectedNodeId, workflow.flow.nodes]);

  useEffect(() => {
    setCanvasNodes(
      toCanvasNodes({
        workflow: workflow.flow,
        runtimeByNodeId: runtimeNodeStatuses,
        selectedNodeId,
      }),
    );
    setCanvasEdges(
      toCanvasEdges({
        workflow: workflow.flow,
        runtimeByNodeId: runtimeNodeStatuses,
        activeNodeIds,
      }),
    );
  }, [activeNodeIds, runtimeNodeStatuses, selectedNodeId, workflow.flow]);

  useEffect(() => {
    if (!reactFlow || canvasNodes.length === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      reactFlow.fitView({
        duration: 280,
        padding: 0.18,
        minZoom: 0.5,
        maxZoom: 1.25,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [reactFlow, workflow.flow.nodes.length, workflow.flow.edges.length]);

  const paletteKinds = useMemo(() => {
    const allowedKinds = workflow.config.allowedNodeKinds;
    const supported = getSupportedDesignerKinds();
    if (!allowedKinds || allowedKinds.length === 0) {
      return supported;
    }
    return supported.filter((kind) => allowedKinds.includes(kind));
  }, [workflow.config.allowedNodeKinds]);

  const selectedNode = useMemo(
    () => workflow.flow.nodes.find((node) => node.id === selectedNodeId),
    [selectedNodeId, workflow.flow.nodes],
  );

  const appendSource = useMemo(
    () => getAppendSource(workflow.flow, selectedNodeId),
    [selectedNodeId, workflow.flow],
  );

  const appendHint = useMemo(() => {
    if (!selectedNode) {
      return "Select a node, then add from the palette to append and auto-connect.";
    }
    if (appendSource) {
      const handle =
        appendSource.sourceHandle ? ` via ${appendSource.sourceHandle.toUpperCase()}` : "";
      return `New nodes will append after ${selectedNode.data.name}${handle}.`;
    }
    return `${selectedNode.data.name} cannot open another outgoing path right now.`;
  }, [appendSource, selectedNode]);

  const emitNotice = useCallback(
    (message: string) => {
      onNotice?.(message);
    },
    [onNotice],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setCanvasNodes((currentNodes) => {
        const nextNodes = applyNodeChanges(
          changes as NodeChange<CanvasNode>[],
          currentNodes,
        ) as CanvasNode[];
        if (!areCanvasAndWorkflowEqual(workflow.flow, nextNodes, canvasEdges)) {
          const nextFlow = extractWorkflowFromCanvas(nextNodes, canvasEdges);
          queueMicrotask(() => workflow.setFlow(nextFlow));
        }
        return nextNodes;
      });
    },
    [canvasEdges, workflow],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setCanvasEdges((currentEdges) => {
        const nextEdges = applyEdgeChanges(
          changes as EdgeChange<CanvasEdge>[],
          currentEdges,
        ) as CanvasEdge[];
        if (!areCanvasAndWorkflowEqual(workflow.flow, canvasNodes, nextEdges)) {
          const nextFlow = extractWorkflowFromCanvas(canvasNodes, nextEdges);
          queueMicrotask(() => workflow.setFlow(nextFlow));
        }
        return nextEdges;
      });
    },
    [canvasNodes, workflow],
  );

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      if (!isConnectionAllowed({ workflow: workflow.flow, connection })) {
        emitNotice("This connection is not allowed.");
        return;
      }

      const result = addEdgeToFlow({
        flow: workflow.flow,
        source: connection.source ?? "",
        target: connection.target ?? "",
        sourceHandle: connection.sourceHandle ?? undefined,
      });

      if (!result.ok) {
        emitNotice(result.message);
        return;
      }

      const nextFlow = {
        ...workflow.flow,
        edges: [...workflow.flow.edges, result.edge],
      };
      workflow.setFlow(nextFlow);
      emitNotice("Connection added.");
    },
    [emitNotice, workflow],
  );

  const onSelectionChange = useCallback<OnSelectionChangeFunc>(({ nodes }) => {
    setSelectedNodeId(nodes.at(-1)?.id);
    if (nodes.length > 0) {
      setPanelTab("config");
    }
  }, []);

  const onNodeMouseEnter = useCallback<NodeMouseHandler>((_, node) => {
    setActiveNodeIds((current) =>
      current.includes(node.id) ? current : [...current, node.id],
    );
  }, []);

  const onNodeMouseLeave = useCallback<NodeMouseHandler>((_, node) => {
    setActiveNodeIds((current) => current.filter((id) => id !== node.id));
  }, []);

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => isConnectionAllowed({ workflow: workflow.flow, connection }),
    [workflow.flow],
  );

  function handleAddNode(kind: NodeKind) {
    if (
      kind === NodeKind.Input &&
      workflow.flow.nodes.some((node) => node.data.kind === NodeKind.Input)
    ) {
      emitNotice("Workflow only allows one input node.");
      return;
    }
    if (
      kind === NodeKind.Output &&
      workflow.flow.nodes.some((node) => node.data.kind === NodeKind.Output)
    ) {
      emitNotice("Workflow only allows one output node.");
      return;
    }

    const nextNode = createDefaultNode(kind, workflow.flow.nodes);
    let nextFlow = {
      ...workflow.flow,
      nodes: [...workflow.flow.nodes, nextNode],
    };

    if (appendSource) {
          const connection: Connection = {
            source: appendSource.source,
            target: nextNode.id,
            sourceHandle: appendSource.sourceHandle ?? null,
            targetHandle: null,
          };
      if (isConnectionAllowed({ workflow: nextFlow, connection })) {
        const edgeResult = addEdgeToFlow({
          flow: nextFlow,
          source: appendSource.source,
          target: nextNode.id,
          sourceHandle: appendSource.sourceHandle,
        });
        if (edgeResult.ok) {
          nextFlow = {
            ...nextFlow,
            edges: [...nextFlow.edges, edgeResult.edge],
          };
        }
      }
    }

    workflow.setFlow(nextFlow);
    setSelectedNodeId(nextNode.id);
    setPanelTab("config");
    emitNotice(`${getNodeKindLabel(kind)} node added.`);
  }

  function handleDeleteNode(nodeId: string) {
    workflow.setFlow((current) => removeNodeFromFlow(current, nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(undefined);
    }
    emitNotice("Node removed together with connected edges.");
  }

  function handleNodeDataChange(nextNodeData: WorkflowNode["data"]) {
    if (!selectedNode) {
      return;
    }
    workflow.setFlow((current) =>
      updateNodeDataInFlow(current, selectedNode.id, () => nextNodeData),
    );
  }

  function handleArrange() {
    const nextNodes = arrangeNodes(workflow.flow.nodes, workflow.flow.edges).nodes;
    workflow.setFlow((current) => ({
      ...current,
      nodes: nextNodes,
    }));
    emitNotice("Nodes arranged using the workflow DAG layout.");
    requestAnimationFrame(() => {
      reactFlow?.fitView({
        duration: 260,
        padding: 0.18,
      });
    });
  }

  function handleDuplicateNode(nodeId: string) {
    const original = workflow.flow.nodes.find((node) => node.id === nodeId);
    if (!original) {
      return;
    }
    const copy = createDefaultNode(original.data.kind, workflow.flow.nodes);
    copy.position = {
      x: original.position.x + 40,
      y: original.position.y + 60,
    };
    copy.data = {
      ...JSON.parse(JSON.stringify(original.data)),
      id: copy.id,
      name: `${original.data.name} Copy`,
    };
    workflow.setFlow((current) => ({
      ...current,
      nodes: [...current.nodes, copy],
    }));
    setSelectedNodeId(copy.id);
    emitNotice(`Duplicated ${original.data.name}.`);
  }

  function handleNodeContextMenu(event: React.MouseEvent, nodeId: string) {
    event.preventDefault();
    const bounds = (event.currentTarget as HTMLElement).closest(
      ".workflow-canvas-shell",
    );
    const rect = bounds?.getBoundingClientRect() ?? { left: 0, top: 0 };
    setContextMenu({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      nodeId,
    });
  }

  useEffect(() => {
    if (!contextMenu) return;
    function handleClick() {
      setContextMenu(null);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu]);

  function handleValidate() {
    emitNotice(
      validation.valid
        ? "Designer state is valid."
        : validation.errors.map((error) => error.message).join(" | "),
    );
  }

  return (
    <section className="workflow-designer-card">
      <div className="workflow-topbar">
        <div className="workflow-topbar-copy">
          <h2 className="panel-title">Workflow Designer</h2>
          <p className="panel-copy">
            ReactFlow-based canvas patterned after better-chatbot. The visual
            layer stays in Next.js, while the workflow graph, validation and
            executor remain package-ready under <code>src/core</code>.
          </p>
        </div>

        <div className="workflow-topbar-actions">
          <span className={`pill ${validation.valid ? "ok-soft" : "error-soft"}`}>
            {validation.valid ? "valid" : `${validation.errors.length} issues`}
          </span>
          <button className="button button-subtle" type="button" onClick={handleArrange}>
            Arrange
          </button>
          <button className="button button-subtle" type="button" onClick={handleValidate}>
            Validate
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setPanelTab("run");
              onRun();
            }}
          >
            {isRunning ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {notice && <div className="workflow-banner">{notice}</div>}

      <div className="workflow-editor-grid">
        <div className="workflow-canvas-shell">
          <ReactFlow<CanvasNode, CanvasEdge>
            fitView
            className="workflow-reactflow"
            nodes={canvasNodes}
            edges={canvasEdges}
            nodeTypes={nodeTypes}
            onInit={setReactFlow}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            isValidConnection={isValidConnection}
            onPaneClick={() => {
              setSelectedNodeId(undefined);
              setContextMenu(null);
            }}
            onNodeContextMenu={(event, node) =>
              handleNodeContextMenu(event, node.id)
            }
            minZoom={0.35}
            maxZoom={1.8}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background color="rgba(20, 33, 61, 0.08)" gap={24} size={1.2} />
            <Controls showInteractive={false} />

            <Panel position="top-left">
              <div className="flow-floating-card">
                <div className="section-label">Node Palette</div>
                <div className="flow-palette-grid">
                  {paletteKinds.map((kind) => {
                    const disabled =
                      (kind === NodeKind.Input &&
                        workflow.flow.nodes.some(
                          (node) => node.data.kind === NodeKind.Input,
                        )) ||
                      (kind === NodeKind.Output &&
                        workflow.flow.nodes.some(
                          (node) => node.data.kind === NodeKind.Output,
                        ));
                    return (
                      <button
                        className="flow-palette-button"
                        disabled={disabled}
                        key={kind}
                        type="button"
                        onClick={() => handleAddNode(kind)}
                      >
                        <span>{getNodeKindLabel(kind)}</span>
                        <small>{kind}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Panel position="bottom-left">
              <div className="flow-floating-card flow-floating-card--hint">
                <div className="section-label">Append Mode</div>
                <div className="muted">{appendHint}</div>
              </div>
            </Panel>

            {workflow.flow.nodes.length === 0 && (
              <Panel position="top-center">
                <WorkflowGreeting />
              </Panel>
            )}
          </ReactFlow>

          {contextMenu && (
            <div
              ref={contextMenuRef}
              className="flow-context-menu"
              style={{
                position: "absolute",
                left: contextMenu.x,
                top: contextMenu.y,
                zIndex: 50,
              }}
            >
              <button
                className="flow-context-menu-item"
                type="button"
                onClick={() => {
                  handleDuplicateNode(contextMenu.nodeId);
                  setContextMenu(null);
                }}
              >
                Duplicate Node
              </button>
              <button
                className="flow-context-menu-item flow-context-menu-item--danger"
                type="button"
                onClick={() => {
                  handleDeleteNode(contextMenu.nodeId);
                  setContextMenu(null);
                }}
              >
                Delete Node
              </button>
            </div>
          )}
        </div>

        <aside className="workflow-side-panel">
          <div className="workflow-panel-tabs">
            <button
              className={`workflow-panel-tab ${panelTab === "config" ? "is-active" : ""}`}
              type="button"
              onClick={() => setPanelTab("config")}
            >
              Config
            </button>
            <button
              className={`workflow-panel-tab ${panelTab === "run" ? "is-active" : ""}`}
              type="button"
              onClick={() => setPanelTab("run")}
            >
              Run
            </button>
          </div>

          {panelTab === "config" ? (
            <WorkflowNodeInspector
              flow={workflow.flow}
              node={selectedNode}
              onChange={handleNodeDataChange}
              onDelete={handleDeleteNode}
            />
          ) : (
            <WorkflowRunPanel
              inputText={inputText}
              isRunning={isRunning}
              notice={notice}
              result={runtimeResult}
              validation={validation}
              histories={runtimeHistories}
              onInputTextChange={onInputTextChange}
              onRun={onRun}
              onClearRuntime={onClearRuntime}
            />
          )}
        </aside>
      </div>
    </section>
  );
}
