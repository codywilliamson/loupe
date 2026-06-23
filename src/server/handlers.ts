// route handlers + the in-memory server context. all /api responses are json.

import { existsSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import type { DiffResult, DiffMeta, ReviewFile, Comment } from "../types";
import { readReview, writeReview } from "../core/reviewStore";
import { compileReviewPrompt } from "../core/promptCompiler";
import { parseDiff } from "../core/diffParser";
import { checkForUpdate } from "../core/updateCheck";
import { scanProject } from "../core/projectScan";
import { collectDiff, runGit } from "../utils/git";

export interface ServerContext {
  diff: DiffResult; // seeded at launch, re-run on each GET /api/diff for live review
  cwd: string; // directory where the .review file lives
  clientDir: string; // directory containing index.html + client assets
  loupeRoot: string; // loupe's own repo root, for the release-update check
  newRef: string | null; // ref for new-side file content; null = read working tree from disk
  diffArgs: string[]; // git args to re-run the diff on demand (refresh)
  includeUntracked: boolean; // working-tree mode also surfaces untracked files
  meta?: DiffMeta; // stable review context (repo + refs); reused across refreshes
  mode?: "diff" | "browse"; // browse re-scans the codebase on refresh instead of re-diffing
  scope?: string; // browse path scope, reused on refresh
  served: boolean; // true once the launch-computed diff has been handed to the client
}

// small json response helper.
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiError(message: string, status: number): Response {
  return json({ error: message }, status);
}

// load the current .review, or build a fresh empty one. used by both posts + compile.
function loadOrInit(ctx: ServerContext): ReviewFile {
  const existing = readReview(ctx.cwd);
  if (existing) return existing;
  const now = new Date().toISOString();
  return {
    meta: { ref: ctx.diff.ref, createdAt: now, updatedAt: now },
    viewed: [],
    comments: [],
  };
}

// re-runs git diff so the view reflects the repo's current state (refresh / live review),
// keeping the last good diff if git errors transiently. the first call reuses the diff already
// computed at launch — no point running git twice for the initial page load.
export function handleGetDiff(ctx: ServerContext): Response {
  if (!ctx.served) {
    ctx.served = true;
    return json(ctx.diff);
  }
  try {
    ctx.diff =
      ctx.mode === "browse"
        ? scanProject(ctx.cwd, ctx.scope)
        : { ...parseDiff(collectDiff(ctx.diffArgs, ctx.cwd, ctx.includeUntracked), ctx.diff.ref), meta: ctx.meta };
  } catch {
    // keep the previous diff
  }
  return json(ctx.diff);
}

export function handleGetComments(ctx: ServerContext): Response {
  return json(readReview(ctx.cwd) ?? {});
}

export async function handlePostComments(ctx: ServerContext, req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid json body", 400);
  }
  const comments = (body as { comments?: unknown }).comments;
  if (!Array.isArray(comments)) {
    return apiError("comments must be an array", 400);
  }
  const review = loadOrInit(ctx);
  review.comments = comments as Comment[];
  review.meta.updatedAt = new Date().toISOString();
  writeReview(ctx.cwd, review);
  return json(review);
}

export async function handlePostViewed(ctx: ServerContext, req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("invalid json body", 400);
  }
  const viewed = (body as { viewed?: unknown }).viewed;
  if (!Array.isArray(viewed)) {
    return apiError("viewed must be an array", 400);
  }
  const review = loadOrInit(ctx);
  review.viewed = viewed as string[];
  review.meta.updatedAt = new Date().toISOString();
  writeReview(ctx.cwd, review);
  return json(review);
}

export function handleGetCompile(ctx: ServerContext): Response {
  const review = loadOrInit(ctx);
  return json({ prompt: compileReviewPrompt(ctx.diff, review) });
}

// reports whether a newer loupe release exists on origin (best-effort, never throws).
export function handleGetUpdate(ctx: ServerContext): Response {
  return json(checkForUpdate(ctx.loupeRoot));
}

// returns the new-side full content of a file (for markdown preview). working tree
// reads from disk; other modes use `git show <newRef>:<path>`.
export function handleGetFile(ctx: ServerContext, url: URL): Response {
  const path = url.searchParams.get("path");
  if (!path || path.includes("..")) return apiError("invalid path", 400);
  try {
    const content =
      ctx.newRef === null
        ? readFileSync(join(ctx.cwd, path), "utf8")
        : runGit(["show", `${ctx.newRef}:${path}`], ctx.cwd);
    return json({ path, content });
  } catch {
    return apiError("file not found", 404);
  }
}

const CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
};

function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extname(path)] ?? "application/octet-stream";
}

// serve a static asset from clientDir. guards against path traversal.
export function serveStatic(ctx: ServerContext, pathname: string): Response {
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (rel.includes("..")) return apiError("not found", 404);

  // resolve and confirm the asset stays inside clientDir (defense in depth).
  const root = resolve(ctx.clientDir);
  const filePath = resolve(root, rel);
  if (filePath !== root && !filePath.startsWith(root + "\\") && !filePath.startsWith(root + "/")) {
    return apiError("not found", 404);
  }
  if (!existsSync(filePath)) return apiError("not found", 404);

  return new Response(readFileSync(filePath), {
    headers: { "Content-Type": contentTypeFor(filePath) },
  });
}

export function notFound(): Response {
  return apiError("not found", 404);
}
