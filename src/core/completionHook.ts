import { basename, join } from "node:path";
import type { ReviewOrigin } from "../types";
import { createReviewRecord, findActiveReview } from "./reviewRecords";
import { loadReviewTarget } from "./reviewTarget";

interface HookPayload {
  cwd?: string;
  session_id?: string;
  task_id?: string;
  last_assistant_message?: string;
}

function childCommand(loupeRoot: string, reviewId: string): string[] {
  return basename(process.execPath).toLowerCase().startsWith("loupe")
    ? [process.execPath, "--review-id", reviewId]
    : [process.execPath, join(loupeRoot, "src", "index.ts"), "--review-id", reviewId];
}

async function performCompletionHook(agent: ReviewOrigin["agent"], loupeRoot: string): Promise<void> {
  let payload: HookPayload = {};
  try { payload = JSON.parse(await Bun.stdin.text()) as HookPayload; } catch { /* use cwd fallback */ }
  const cwd = payload.cwd ?? process.cwd();
  const active = findActiveReview(cwd);
  if (active) return console.log(JSON.stringify({ systemMessage: `Loupe review ${active.id} is still active.` }));
  const loaded = loadReviewTarget(cwd);
  if (loaded.diff.files.length === 0) return;
  const origin: ReviewOrigin = { agent, ...(payload.session_id ? { sessionId: payload.session_id } : {}), ...(payload.task_id ? { taskId: payload.task_id } : {}), ...(payload.last_assistant_message ? { summary: payload.last_assistant_message } : {}) };
  const record = createReviewRecord({ target: { cwd, ref: loaded.diff.ref, ...(loaded.meta ? { meta: loaded.meta } : {}) }, policy: "required", origin });
  if (process.env.LOUPE_HOOK_NO_SPAWN !== "1") {
    const command = childCommand(loupeRoot, record.id);
    if (process.env.LOUPE_NO_OPEN === "1") command.push("--no-open");
    const child = Bun.spawn(command, { cwd, env: { ...process.env, LOUPE_SESSION_HOST: "hook" }, stdin: "ignore", stdout: "ignore", stderr: "ignore" });
    child.unref();
  }
  console.log(JSON.stringify({ systemMessage: `Loupe review ${record.id} opened. Resume after reviewing, or explicitly continue without waiting.` }));
}

export async function runCompletionHook(agent: ReviewOrigin["agent"], loupeRoot: string): Promise<void> {
  try { await performCompletionHook(agent, loupeRoot); }
  catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.log(JSON.stringify({ systemMessage: `Loupe review was not opened: ${message}` }));
  }
}
