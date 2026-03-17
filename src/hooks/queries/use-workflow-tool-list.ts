"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

export function useWorkflowToolList() {
  const { data, isLoading } = useSWR("/api/workflow/tools", fetcher, {
    fallbackData: [],
  });
  return { data: data ?? [], isLoading };
}
