import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ReviewPolicy } from "../types";
import type { McpRootProvider, ReviewOperationResult, ReviewOperations } from "./operations";
import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

const policy = z.enum(["required", "handoff", "off"] satisfies [ReviewPolicy, ...ReviewPolicy[]]);
const id = z.string().trim().min(1).max(200);
const summary = z.string().trim().max(10_000).optional();

function result(value: ReviewOperationResult) {
  return {
    structuredContent: value,
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
  };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "Loupe operation failed";
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

export function createMcpServer(operations: ReviewOperations, roots: McpRootProvider, version = "0.0.0") {
  const server = new McpServer({ name: "loupe", version });
  const guarded = async (cwd: string) => {
    const rootList = await roots.getRoots();
    if (rootList.length === 0) throw new Error("No approved MCP root is available");
    const allowed = rootList.some((root) => {
      const rootPath = realpathSync(resolve(root));
      const candidate = realpathSync(resolve(cwd));
      const rest = relative(rootPath, candidate);
      return rest === "" || (!rest.startsWith("..") && rest !== ".." && !isAbsolute(rest));
    });
    if (!allowed) throw new Error("cwd must be inside an approved MCP root");
  };

  server.registerTool("start_review", {
    title: "Start review", description: "Start a review for an explicit Git comparison.",
    inputSchema: { cwd: z.string().trim().min(1), ref: z.string().trim().min(1).max(500), policy: policy.optional(), origin: z.object({ agent: z.enum(["codex", "claude-code"]).optional(), sessionId: id.optional(), taskId: id.optional(), originalRequest: z.string().max(10_000).optional(), summary }).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async (input) => { try { await guarded(input.cwd); return result(await operations.startReview(input)); } catch (e) { return failure(e); } });

  server.registerTool("get_review", {
    title: "Get review", description: "Inspect the durable status and feedback for a review.",
    inputSchema: { reviewId: id }, annotations: { title: "Get review", readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  }, async ({ reviewId }) => { try { return result(await operations.getReview(reviewId)); } catch (e) { return failure(e); } });

  server.registerTool("reply_to_comment", {
    title: "Reply to comment", description: "Reply to an unresolved review comment as the agent.",
    inputSchema: { reviewId: id, commentId: id, text: z.string().trim().min(1).max(20_000) },
    annotations: { title: "Reply to comment", readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async (input) => { try { return result(await operations.replyToComment(input)); } catch (e) { return failure(e); } });

  server.registerTool("mark_comment_addressed", {
    title: "Mark comment addressed", description: "Mark a reviewer comment addressed after making the requested change.",
    inputSchema: { reviewId: id, commentId: id }, annotations: { title: "Mark comment addressed", readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, async (input) => { try { return result(await operations.markCommentAddressed(input)); } catch (e) { return failure(e); } });

  server.registerTool("request_rereview", {
    title: "Request rereview", description: "Tell the reviewer that changes are ready for another review.",
    inputSchema: { reviewId: id, summary }, annotations: { title: "Request rereview", readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async (input) => { try { return result(await operations.requestRereview(input)); } catch (e) { return failure(e); } });

  server.registerTool("cancel_review", {
    title: "Cancel review", description: "Cancel an active review without approving it.",
    inputSchema: { reviewId: id, summary }, annotations: { title: "Cancel review", readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  }, async (input) => { try { return result(await operations.cancelReview(input)); } catch (e) { return failure(e); } });
  return server;
}
