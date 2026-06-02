#!/usr/bin/env bun
// loupe cli entry point: resolve the ref arg, run + parse the diff, serve it, open the browser.

import { join } from "node:path";
import { resolveRef, runGit } from "./utils/git";
import { parseDiff } from "./core/diffParser";
import { createServer } from "./server/router";

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
  try {
    const plan = resolveRef(spec, cwd);
    diff = parseDiff(runGit(plan.diffArgs, cwd), plan.refLabel);
  } catch (err) {
    console.error(`[loupe] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const clientDir = join(import.meta.dir, "client");
  const server = createServer({ diff, cwd, clientDir });
  const url = `http://localhost:${server.port}`;

  openBrowser(url);
  console.log(`[loupe] reviewing ${diff.ref} — ${diff.files.length} file(s) changed`);
  console.log(`loupe running at ${url}  (ctrl+c to stop)`);
}

main();
