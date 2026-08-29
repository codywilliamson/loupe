#!/usr/bin/env bun
// loupe cli entry point: launch a browser review or run the local MCP server.

import { join } from "node:path";
import { parseCliArgs, USAGE } from "./utils/cli";
import { launchReview } from "./core/reviewLaunch";
import { currentVersion } from "./core/updateCheck";
import { runMcpServer } from "./mcp";
import { installationRoot } from "./utils/installRoot";
import { runCompletionHook } from "./core/completionHook";

// ansi styling, skipped when stdout isn't a terminal.
const tty = process.stdout.isTTY === true;
const paint = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const accent = paint("38;5;173"); // claude terracotta
const bold = paint("1");
const dim = paint("2");

function fail(message: string): never {
  console.error(`${accent("✻ loupe")} ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const loupeRoot = installationRoot(join(import.meta.dir, ".."));

  let opts;
  try {
    opts = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  if (opts.help) return console.log(USAGE);
  if (opts.version) return console.log(`loupe v${currentVersion(loupeRoot)}`);
  if (opts.command === "mcp") return runMcpServer(cwd);
  if (opts.command === "hook") {
    if (!opts.agent) fail("hook stop requires --agent codex or claude-code");
    return runCompletionHook(opts.agent, loupeRoot);
  }
  let launch;
  try {
    launch = launchReview({
      cwd, loupeRoot, spec: opts.spec, scope: opts.scope, reviewId: opts.reviewId,
      policy: "handoff", port: opts.port, open: opts.open,
    });
  } catch (err) {
    fail(err instanceof Error ? err.message : `port ${opts.port} is already in use`);
  }
  const files = launch.diff.files.length;
  const changed = launch.diff.meta?.mode === "browse" ? "" : " changed";
  console.log(`${accent("✻ loupe")} ${dim(`v${currentVersion(loupeRoot)}`)} — reviewing ${bold(launch.diff.ref)} (${files} file${files === 1 ? "" : "s"}${changed})`);
  console.log(`  ${bold(launch.url)}  ${dim("(ctrl+c to stop)")}`);
}

await main();
