import type { Server } from "bun";
import { resolve } from "node:path";
import { launchReview } from "../core/reviewLaunch";
import {
  cancelReview, markCommentAddressed, readReviewRecord, replyToComment,
  requestRereview, updateReviewRecord,
} from "../core/reviewRecords";
import type { ReviewOperationResult, ReviewOperations } from "./operations";

function found(reviewId: string): ReviewOperationResult {
  const review = readReviewRecord(reviewId);
  if (!review) throw new Error("review record not found");
  return { review };
}

export function createReviewOperations(loupeRoot: string): ReviewOperations {
  const servers = new Map<string, Server<undefined>>();
  return {
    async startReview(input) {
      const launch = launchReview({
        cwd: resolve(input.cwd), loupeRoot, spec: input.ref, policy: input.policy ?? "required",
        open: process.env.LOUPE_NO_OPEN !== "1", ...(input.origin ? { origin: input.origin } : {}),
      });
      servers.set(launch.review.id, launch.server);
      return { review: launch.review, url: launch.url };
    },
    async getReview(reviewId) { return found(reviewId); },
    async replyToComment(input) {
      return { review: replyToComment(input.reviewId, input.commentId, input.text, "agent") };
    },
    async markCommentAddressed(input) {
      return { review: markCommentAddressed(input.reviewId, input.commentId) };
    },
    async requestRereview(input) {
      if (input.summary !== undefined) updateReviewRecord(input.reviewId, { summary: input.summary });
      return { review: requestRereview(input.reviewId) };
    },
    async cancelReview(input) { return { review: cancelReview(input.reviewId, input.summary) }; },
  };
}
