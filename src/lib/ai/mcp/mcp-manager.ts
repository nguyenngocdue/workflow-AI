export const mcpClientsManager = {
  getTools: async (_serverId: string) => [],
  executeToolCall: async (_serverId: string, _toolName: string, _args: any) => {
    throw new Error("MCP is not available in standalone mode");
  },
};
