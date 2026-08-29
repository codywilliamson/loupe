import type { ReviewOrigin, ReviewPolicy, ReviewRecord } from "../types";

export interface StartReviewInput {
  cwd: string;
  ref: string;
  policy?: ReviewPolicy;
  origin?: ReviewOrigin;
}

export interface ReviewOperationResult {
  [key: string]: unknown;
  review: ReviewRecord;
  url?: string;
}

export interface ReviewOperations {
  startReview(input: StartReviewInput): Promise<ReviewOperationResult>;
  getReview(reviewId: string): Promise<ReviewOperationResult>;
  replyToComment(input: { reviewId: string; commentId: string; text: string }): Promise<ReviewOperationResult>;
  markCommentAddressed(input: { reviewId: string; commentId: string }): Promise<ReviewOperationResult>;
  requestRereview(input: { reviewId: string; summary?: string }): Promise<ReviewOperationResult>;
  cancelReview(input: { reviewId: string; summary?: string }): Promise<ReviewOperationResult>;
}

export interface McpRootProvider {
  getRoots(): Promise<string[]>;
}
