#!/usr/bin/env bun
// loupe cli entry point: parse args, resolve the ref, run + parse the diff, serve, open the browser.

import { join } from "node:path";
import { resolveRef, collectDiff, repoName } from "./utils/git";
import { parseCliArgs, USAGE } from "./utils/cli";
import { parseDiff } from "./core/diffParser";
import { scanProject } from "./core/projectScan";
import { currentVersion } from "./core/updateCheck";
import { createServer } from "./server/router";
import type { DiffMeta } from "./types";

// ansi styling, skipped when stdout isn't a terminal.
const tty = process.stdout.isTTY === true;
const paint = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
const accent = paint("38;5;173"); // claude terracotta
const bold = paint("1");
const dim = paint("2");

// opens the default browser at url, best-effort per platform.
function openBrowser(url: string): void {
  const cmd =
    process.platform === "win32"
      ? ["cmd", "/c", "start", "", url]
      : process.platform === "darwin"
        ? ["open", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    // opening the browser is best-effort; the url is printed regardless.
  }
}

function fail(message: string): never {
  console.error(`${accent("✻ loupe")} ${message}`);
  process.exit(1);
}

function main(): void {
  const cwd = process.cwd();
  const loupeRoot = join(import.meta.dir, ".."); // src/ → repo root

  let opts;
  try {
    opts = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  if (opts.help) return console.log(USAGE);
  if (opts.version) return console.log(`loupe v${currentVersion(loupeRoot)}`);

  let diff;
  let newRef: string | null = null;
  let diffArgs: string[] = [];
  let includeUntracked = false;
  let meta: DiffMeta | undefined;
  const mode: "diff" | "browse" = opts.spec === "browse" ? "browse" : "diff";
  try {
    if (mode === "browse") {
      diff = scanProject(cwd, opts.scope);
      meta = diff.meta;
    } else {
      const plan = resolveRef(opts.spec, cwd);
      newRef = plan.newRef;
      diffArgs = plan.diffArgs;
      includeUntracked = plan.includeUntracked;
      meta = { repo: repoName(cwd), mode: plan.mode, source: plan.source, target: plan.target };
      diff = { ...parseDiff(collectDiff(plan.diffArgs, cwd, includeUntracked), plan.refLabel), meta };
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  const clientDir = join(import.meta.dir, "client");
  const ctx = { diff, cwd, clientDir, loupeRoot, newRef, diffArgs, includeUntracked, meta, mode, scope: opts.scope, served: false };
  let server;
  try {
    server = createServer(ctx, opts.port);
  } catch {
    fail(`port ${opts.port} is already in use (pick another with --port)`);
  }
  const url = `http://localhost:${server.port}`;

  if (opts.open) openBrowser(url);
  const files = diff.files.length;
  const changed = mode === "browse" ? "" : " changed";
  console.log(`${accent("✻ loupe")} ${dim(`v${currentVersion(loupeRoot)}`)} — reviewing ${bold(diff.ref)} (${files} file${files === 1 ? "" : "s"}${changed})`);
  console.log(`  ${bold(url)}  ${dim("(ctrl+c to stop)")}`);
}

main();
