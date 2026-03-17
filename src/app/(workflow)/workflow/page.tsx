import WorkflowListPage from "@/components/workflow/workflow-list-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <WorkflowListPage userRole="user" />;
}
