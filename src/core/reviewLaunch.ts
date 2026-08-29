import type { Server } from "bun";
import { join, resolve } from "node:path";
import type { DiffResult, ReviewOrigin, ReviewPolicy, ReviewRecord } from "../types";
import { openBrowser } from "../utils/browser";
import { createServer } from "../server/router";
import { createReviewRecord, readReviewRecord } from "./reviewRecords";
import { loadReviewTarget } from "./reviewTarget";

export interface ReviewLaunchInput {
  cwd: string;
  loupeRoot: string;
  spec?: string;
  scope?: string;
  reviewId?: string;
  policy?: ReviewPolicy;
  origin?: ReviewOrigin;
  port?: number;
  open?: boolean;
}

export interface ReviewLaunch {
  review: ReviewRecord;
  url: string;
  server: Server<undefined>;
  diff: DiffResult;
}

export function launchReview(input: ReviewLaunchInput): ReviewLaunch {
  const existing = input.reviewId ? readReviewRecord(input.reviewId) : null;
  if (input.reviewId && !existing) throw new Error("review record not found");
  const cwd = resolve(existing?.target.cwd ?? input.cwd);
  const spec = existing?.target.spec ?? input.spec;
  const loaded = loadReviewTarget(cwd, spec, input.scope, false);
  const review = existing ?? createReviewRecord({
    target: { cwd, ref: loaded.diff.ref, ...(spec ? { spec } : {}), ...(loaded.meta ? { meta: loaded.meta } : {}) },
    policy: input.policy ?? "handoff", ...(input.origin ? { origin: input.origin } : {}),
  });
  const clientDir = join(input.loupeRoot, "src", "client");
  const ctx = { ...loaded, cwd, clientDir, loupeRoot: input.loupeRoot, served: false, reviewId: review.id };
  const server = createServer(ctx, input.port ?? 0);
  const url = `http://localhost:${server.port}/?review=${encodeURIComponent(review.id)}`;
  if (input.open !== false) openBrowser(url);
  return { review, url, server, diff: loaded.diff };
}
