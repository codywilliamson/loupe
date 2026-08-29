import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server";
import type { McpRootProvider, ReviewOperations } from "./operations";

export async function serveMcp(operations: ReviewOperations, roots: McpRootProvider, version?: string): Promise<void> {
  const server = createMcpServer(operations, roots, version);
  await server.connect(new StdioServerTransport());
}

export function configuredRoots(fallback: string): McpRootProvider {
  return { getRoots: async () => (process.env.LOUPE_ROOT ? [process.env.LOUPE_ROOT] : [fallback]) };
}
