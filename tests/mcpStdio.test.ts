import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const root = join(import.meta.dir, "..");

describe("MCP stdio entry", () => {
  test("serves the Loupe tools through the CLI command", async () => {
    const repo = mkdtempSync(join(tmpdir(), "loupe-mcp-repo-"));
    const data = mkdtempSync(join(tmpdir(), "loupe-mcp-data-"));
    const git = (args: string[]) => Bun.spawnSync(["git", ...args], { cwd: repo });
    git(["init", "-q", "-b", "main"]); git(["config", "user.name", "t"]); git(["config", "user.email", "t@e.com"]);
    writeFileSync(join(repo, "a.ts"), "one\n"); git(["add", "-A"]); git(["commit", "-q", "-m", "init"]); writeFileSync(join(repo, "a.ts"), "two\n");
    const transport = new StdioClientTransport({
      command: "bun", args: ["src/index.ts", "mcp", "serve"], cwd: root,
      env: { ...process.env, LOUPE_ROOT: repo, LOUPE_DATA_DIR: data, LOUPE_NO_OPEN: "1" } as Record<string, string>,
    });
    const client = new Client({ name: "loupe-test", version: "1" });
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("start_review");
      expect(tools.tools).toHaveLength(6);
      const started = await client.callTool({ name: "start_review", arguments: { cwd: repo, ref: "working" } });
      expect(started.isError).not.toBe(true);
      expect((started.structuredContent as { url: string }).url).toContain("review=");
    } finally { await client.close(); rmSync(repo, { recursive: true, force: true }); rmSync(data, { recursive: true, force: true }); }
  });
});
