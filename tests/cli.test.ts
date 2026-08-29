import { describe, expect, test } from "bun:test";
import { parseCliArgs, USAGE } from "../src/utils/cli";

describe("parseCliArgs", () => {
  test("defaults: working tree, random port, open browser", () => {
    expect(parseCliArgs([])).toEqual({ command: "review", agent: undefined, spec: undefined, scope: undefined, reviewId: undefined, port: 0, open: true, help: false, version: false });
  });

  test("first positional arg is the ref spec", () => {
    expect(parseCliArgs(["staged"]).spec).toBe("staged");
    expect(parseCliArgs(["main..feature"]).spec).toBe("main..feature");
  });

  test("help and version flags (short + long)", () => {
    expect(parseCliArgs(["--help"]).help).toBe(true);
    expect(parseCliArgs(["-h"]).help).toBe(true);
    expect(parseCliArgs(["--version"]).version).toBe(true);
    expect(parseCliArgs(["-v"]).version).toBe(true);
  });

  test("--port parses its value", () => {
    expect(parseCliArgs(["--port", "8080"]).port).toBe(8080);
    expect(parseCliArgs(["-p", "3000"]).port).toBe(3000);
  });

  test("--no-open disables the browser", () => {
    expect(parseCliArgs(["--no-open"]).open).toBe(false);
  });

  test("flags combine with a ref spec in any order", () => {
    const opts = parseCliArgs(["--no-open", "origin/main", "-p", "4000"]);
    expect(opts).toEqual({ command: "review", agent: undefined, spec: "origin/main", scope: undefined, reviewId: undefined, port: 4000, open: false, help: false, version: false });
  });

  test("rejects a bad port", () => {
    expect(() => parseCliArgs(["--port"])).toThrow("--port needs a number");
    expect(() => parseCliArgs(["--port", "abc"])).toThrow("--port needs a number");
    expect(() => parseCliArgs(["--port", "70000"])).toThrow("--port needs a number");
    expect(() => parseCliArgs(["--port", "0"])).toThrow("--port needs a number");
  });

  test("rejects unknown flags and extra positionals", () => {
    expect(() => parseCliArgs(["--bogus"])).toThrow("unknown option: --bogus");
    expect(() => parseCliArgs(["a", "b"])).toThrow("unexpected argument: b");
  });

  test("parses the browse command", () => {
    expect(parseCliArgs(["browse"]).spec).toBe("browse");
    expect(parseCliArgs(["browse"]).scope).toBeUndefined();
  });

  test("browse accepts an optional path scope", () => {
    const opts = parseCliArgs(["browse", "src/"]);
    expect(opts.spec).toBe("browse");
    expect(opts.scope).toBe("src/");
  });

  test("a second positional is only allowed after browse", () => {
    expect(() => parseCliArgs(["main", "src/"])).toThrow("unexpected argument: src/");
  });

  test("usage documents browse", () => {
    expect(USAGE).toContain("browse [path]");
  });

  test("usage covers every option", () => {
    for (const flag of ["--port", "--no-open", "--review-id", "--version", "--help"]) {
      expect(USAGE).toContain(flag);
    }
  });

  test("parses the MCP server command and durable review id", () => {
    expect(parseCliArgs(["mcp", "serve"]).command).toBe("mcp");
    expect(parseCliArgs(["--review-id", "r1"]).reviewId).toBe("r1");
    expect(() => parseCliArgs(["mcp", "nope"])).toThrow("mcp requires the serve command");
  });

  test("parses optional completion hooks", () => {
    expect(parseCliArgs(["hook", "stop", "--agent", "claude-code"]).agent).toBe("claude-code");
    expect(() => parseCliArgs(["hook", "stop", "--agent", "other"])).toThrow("--agent must be");
  });
});
