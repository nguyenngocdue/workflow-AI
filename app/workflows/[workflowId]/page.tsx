import { WorkflowDesignerPage } from "@/src/features/designer/workflow-designer-page";

export default async function Page({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  return <WorkflowDesignerPage workflowId={workflowId} />;
}
