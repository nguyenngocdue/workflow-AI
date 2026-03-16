"use client";

import { useCallback, useMemo } from "react";
import { createWorkflowAgent } from "@/src/core/executor";
import type {
  WorkflowData,
  WorkflowExecutionResult,
  WorkflowValidationResult,
} from "@/src/core/types";
import { validateWorkflow } from "@/src/core/validation";
import { cloneValue } from "@/src/core/utils";
import { useWorkflowContext } from "@/src/workflow-provider";

export function useWorkflow() {
  const { flow, setFlow, adapters, config, runtime, setRuntime } =
    useWorkflowContext();

  const getFlow = useCallback((): WorkflowData => cloneValue(flow), [flow]);

  const toJSON = useCallback(() => JSON.stringify(flow, null, 2), [flow]);

  const validate = useCallback((): WorkflowValidationResult => {
    return validateWorkflow(flow);
  }, [flow]);

  const replaceFlow = useCallback(
    (nextFlow: WorkflowData) => {
      setFlow(nextFlow);
      setRuntime({
        status: "idle",
      });
    },
    [setFlow, setRuntime],
  );

  const execute = useCallback(
    async (input: Record<string, unknown>): Promise<WorkflowExecutionResult> => {
      setRuntime({
        status: "running",
      });

      const agent = createWorkflowAgent({
        workflow: flow,
        adapters,
      });
      const result = await agent.run(input);

      setRuntime({
        status: result.isOk ? "success" : "error",
        lastResult: result,
      });

      return result;
    },
    [adapters, flow, setRuntime],
  );

  const clearRuntime = useCallback(() => {
    setRuntime({
      status: "idle",
    });
  }, [setRuntime]);

  return useMemo(
    () => ({
      flow,
      config,
      runtime,
      setFlow,
      getFlow,
      toJSON,
      validate,
      replaceFlow,
      execute,
      clearRuntime,
    }),
    [
      clearRuntime,
      config,
      execute,
      flow,
      getFlow,
      replaceFlow,
      runtime,
      setFlow,
      toJSON,
      validate,
    ],
  );
}
