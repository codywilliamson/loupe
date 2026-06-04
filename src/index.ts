#!/usr/bin/env bun
// loupe cli entry point: resolve the ref arg, run + parse the diff, serve it, open the browser.

import { join } from "node:path";
import { resolveRef, collectDiff, repoName } from "./utils/git";
import { parseDiff } from "./core/diffParser";
import { createServer } from "./server/router";
import type { DiffMeta } from "./types";

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

function main(): void {
  const cwd = process.cwd();
  const spec = process.argv[2];

  let diff;
  let newRef: string | null = null;
  let diffArgs: string[] = [];
  let includeUntracked = false;
  let meta: DiffMeta | undefined;
  try {
    const plan = resolveRef(spec, cwd);
    newRef = plan.newRef;
    diffArgs = plan.diffArgs;
    includeUntracked = plan.includeUntracked;
    meta = { repo: repoName(cwd), mode: plan.mode, source: plan.source, target: plan.target };
    diff = { ...parseDiff(collectDiff(plan.diffArgs, cwd, includeUntracked), plan.refLabel), meta };
  } catch (err) {
    console.error(`[loupe] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const clientDir = join(import.meta.dir, "client");
  const loupeRoot = join(import.meta.dir, ".."); // src/ → repo root
  const server = createServer({ diff, cwd, clientDir, loupeRoot, newRef, diffArgs, includeUntracked, meta });
  const url = `http://localhost:${server.port}`;

  openBrowser(url);
  console.log(`[loupe] reviewing ${diff.ref} — ${diff.files.length} file(s) changed`);
  console.log(`loupe running at ${url}  (ctrl+c to stop)`);
}

main();
