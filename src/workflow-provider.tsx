"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  WorkflowData,
  WorkflowExecutionResult,
  WorkflowHostConfig,
} from "@/src/core/types";
import type { WorkflowAdapters } from "@/src/infrastructure/adapters";

type WorkflowRuntimeState = {
  status: "idle" | "running" | "success" | "error";
  lastResult?: WorkflowExecutionResult;
};

type WorkflowContextValue = {
  flow: WorkflowData;
  setFlow: Dispatch<SetStateAction<WorkflowData>>;
  adapters: WorkflowAdapters;
  config: WorkflowHostConfig;
  runtime: WorkflowRuntimeState;
  setRuntime: Dispatch<SetStateAction<WorkflowRuntimeState>>;
};

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export type WorkflowProviderProps = {
  children: ReactNode;
  initialFlow: WorkflowData;
  adapters?: WorkflowAdapters;
  config?: WorkflowHostConfig;
  onFlowChange?: (flow: WorkflowData) => void;
};

export function 
WorkflowProvider({
  children,
  initialFlow,
  adapters = {},
  config = {},
  onFlowChange,
}: WorkflowProviderProps) {
  const [flow, setFlowState] = useState<WorkflowData>(initialFlow);
  const [runtime, setRuntime] = useState<WorkflowRuntimeState>({
    status: "idle",
  });
  const onFlowChangeRef = useRef<WorkflowProviderProps["onFlowChange"] | undefined>(
    onFlowChange,
  );
  const skipOnFlowChangeRef = useRef(false);

  useEffect(() => {
    onFlowChangeRef.current = onFlowChange;
  }, [onFlowChange]);

  useEffect(() => {
    setFlowState(initialFlow);
    skipOnFlowChangeRef.current = true;
  }, [initialFlow]);

  const setFlow = useCallback<Dispatch<SetStateAction<WorkflowData>>>(
    (nextValue) => {
      setFlowState((previous) => {
        return typeof nextValue === "function"
          ? (nextValue as (current: WorkflowData) => WorkflowData)(previous)
          : nextValue;
      });
    },
    [],
  );

  useEffect(() => {
    if (skipOnFlowChangeRef.current) {
      skipOnFlowChangeRef.current = false;
      return;
    }
    if (!onFlowChangeRef.current) {
      return;
    }
    onFlowChangeRef.current(flow);
  }, [flow]);

  const contextValue = useMemo(
    () => ({
      flow,
      setFlow,
      adapters,
      config,
      runtime,
      setRuntime,
    }),
    [adapters, config, flow, runtime, setFlow],
  );

  return (
    <WorkflowContext.Provider value={contextValue}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowContext() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflowContext must be used inside WorkflowProvider");
  }
  return context;
}
