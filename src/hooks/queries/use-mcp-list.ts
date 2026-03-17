"use client";
import { MCPServerInfo } from "app-types/mcp";

export function useMcpList() {
  return { data: [] as MCPServerInfo[], isLoading: false };
}
