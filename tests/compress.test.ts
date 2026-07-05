import { describe, expect, test } from "bun:test";
import { gunzipSync } from "bun";
import { maybeCompress } from "../src/server/compress";

const bigJson = JSON.stringify({ data: "x".repeat(5000) });

function jsonResponse(body: string): Response {
  return new Response(body, { headers: { "Content-Type": "application/json" } });
}

function gzipRequest(): Request {
  return new Request("http://localhost/api/diff", { headers: { "Accept-Encoding": "gzip, deflate" } });
}

describe("maybeCompress", () => {
  test("gzips large json when the client accepts gzip", async () => {
    const res = await maybeCompress(gzipRequest(), jsonResponse(bigJson));
    expect(res.headers.get("Content-Encoding")).toBe("gzip");
    expect(res.headers.get("Vary")).toBe("Accept-Encoding");
    const body = new Uint8Array(await res.arrayBuffer());
    expect(new TextDecoder().decode(gunzipSync(body))).toBe(bigJson);
  });

  test("passes through when the client does not accept gzip", async () => {
    const req = new Request("http://localhost/api/diff");
    const res = await maybeCompress(req, jsonResponse(bigJson));
    expect(res.headers.get("Content-Encoding")).toBeNull();
    expect(await res.text()).toBe(bigJson);
  });

  test("passes through small bodies", async () => {
    const res = await maybeCompress(gzipRequest(), jsonResponse("{}"));
    expect(res.headers.get("Content-Encoding")).toBeNull();
  });

  test("passes through non-compressible content types", async () => {
    const png = new Response("x".repeat(5000), { headers: { "Content-Type": "application/octet-stream" } });
    const res = await maybeCompress(gzipRequest(), png);
    expect(res.headers.get("Content-Encoding")).toBeNull();
  });

  test("preserves status codes", async () => {
    const notFound = new Response(bigJson, { status: 404, headers: { "Content-Type": "application/json" } });
    const res = await maybeCompress(gzipRequest(), notFound);
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Encoding")).toBe("gzip");
  });
});
