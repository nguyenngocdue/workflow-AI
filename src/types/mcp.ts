import { tag } from "lib/tag";
import { z } from "zod";

export const MCPRemoteConfigZodSchema = z.object({
  url: z.string().url().describe("The URL of the SSE endpoint"),
  headers: z.record(z.string(), z.string()).optional(),
});

export const MCPStdioConfigZodSchema = z.object({
  command: z.string().min(1).describe("The command to run"),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

export const AllowedMCPServerZodSchema = z.object({
  tools: z.array(z.string()),
});

export type AllowedMCPServer = z.infer<typeof AllowedMCPServerZodSchema>;

export type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigZodSchema>;
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>;

export type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig;

export type MCPToolInfo = {
  name: string;
  description: string;
  inputSchema?: {
    type?: any;
    properties?: Record<string, any>;
    required?: string[];
  };
};

export type MCPServerInfo = {
  id: string;
  name: string;
  description?: string;
  toolInfo: MCPToolInfo[];
  toolInfoUpdatedAt?: Date | null;
  config: MCPServerConfig;
  status?: "connected" | "disconnected" | "error";
  icon?: { type: "emoji"; value: string; style?: Record<string, string> };
  updatedAt?: Date;
  visibility?: "public" | "private" | "readonly";
  userName?: string;
  userAvatar?: string;
};

export const MCPServerInfoTag = tag<MCPServerInfo>("mcp-server-info");
