// builds Bun.serve and routes requests to handlers by method + pathname.

import type { Server } from "bun";
import type { ServerContext } from "./handlers";
import {
  handleGetDiff,
  handleGetComments,
  handlePostComments,
  handlePostViewed,
  handleGetCompile,
  handleGetFile,
  handleGetUpdate,
  handleGetState,
  handlePostState,
  serveStatic,
  notFound,
} from "./handlers";

export type { ServerContext } from "./handlers";

function route(ctx: ServerContext, req: Request): Response | Promise<Response> {
  const { pathname } = new URL(req.url);
  const { method } = req;

  if (method === "GET") {
    if (pathname === "/api/diff") return handleGetDiff(ctx);
    if (pathname === "/api/comments") return handleGetComments(ctx);
    if (pathname === "/api/compile") return handleGetCompile(ctx);
    if (pathname === "/api/update") return handleGetUpdate(ctx);
    if (pathname === "/api/state") return handleGetState();
    if (pathname === "/api/file") return handleGetFile(ctx, new URL(req.url));
    if (!pathname.startsWith("/api/")) return serveStatic(ctx, pathname);
  }

  if (method === "POST") {
    if (pathname === "/api/comments") return handlePostComments(ctx, req);
    if (pathname === "/api/viewed") return handlePostViewed(ctx, req);
    if (pathname === "/api/state") return handlePostState(req);
  }

  return notFound();
}

export function createServer(ctx: ServerContext, port = 0): Server<undefined> {
  return Bun.serve({
    port,
    fetch: (req) => route(ctx, req),
  });
}
