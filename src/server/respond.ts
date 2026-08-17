// the two json response shapes every handler returns.

import type { ApiError } from "../types";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function apiError(message: string, status: number): Response {
  return json({ error: message } satisfies ApiError, status);
}
