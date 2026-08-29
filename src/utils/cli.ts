// cli argument parsing for the loupe entry point. pure — no io, fully unit-tested.

export interface CliOptions {
  command: "review" | "mcp" | "hook";
  agent: "codex" | "claude-code" | undefined;
  spec: string | undefined; // ref spec; absent = working tree vs HEAD
  scope: string | undefined; // path scope for `browse`; ignored otherwise
  reviewId: string | undefined; // durable Review Record supplied by an integration
  port: number; // 0 = any free port
  open: boolean; // open the browser once serving
  help: boolean;
  version: boolean;
}

export const USAGE = `loupe — local git diff review with inline comments and LLM prompt export

Usage
  loupe [ref] [options]
  loupe mcp serve
  loupe hook stop --agent <codex|claude-code>

Refs
  (none)            working tree vs HEAD, untracked files included
  staged            staged changes only
  <branch>          current branch vs <branch> (pr-style three-dot)
  <ref1>..<ref2>    commit range
  browse [path]     review the whole codebase (optionally scoped to a path)

Options
  -p, --port <n>    serve on a fixed port (default: any free port)
      --no-open     don't open the browser automatically
      --review-id   open an existing durable Review Record
  -v, --version     print the installed version
  -h, --help        show this help

Comments are saved to .review in the current directory and compile into a
structured review prompt from the UI.`;

const MAX_PORT = 65535;

// maps argv (already sliced past the runtime + script) into options.
// throws a user-facing message on unknown flags or a bad port.
export function parseCliArgs(argv: string[]): CliOptions {
  const args = [...argv];
  const command = args[0] === "mcp" ? "mcp" : args[0] === "hook" ? "hook" : "review";
  if (command === "mcp" || command === "hook") {
    args.shift();
    const subcommand = args.shift();
    if (command === "mcp" && subcommand !== "serve") throw new Error("mcp requires the serve command");
    if (command === "hook" && subcommand !== "stop") throw new Error("hook requires the stop command");
  }
  const opts: CliOptions = { command, agent: undefined, spec: undefined, scope: undefined, reviewId: undefined, port: 0, open: true, help: false, version: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg === "-v" || arg === "--version") opts.version = true;
    else if (arg === "--no-open") opts.open = false;
    else if (arg === "--review-id") {
      const id = args[++i];
      if (!id) throw new Error("--review-id needs an id");
      opts.reviewId = id;
    }
    else if (arg === "--agent") {
      const agent = args[++i];
      if (agent !== "codex" && agent !== "claude-code") throw new Error("--agent must be codex or claude-code");
      opts.agent = agent;
    }
    else if (arg === "-p" || arg === "--port") {
      const raw = args[++i];
      const port = Number(raw);
      if (!raw || !Number.isInteger(port) || port < 1 || port > MAX_PORT) {
        throw new Error(`--port needs a number between 1 and ${MAX_PORT} (got ${raw ?? "nothing"})`);
      }
      opts.port = port;
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option: ${arg} (try --help)`);
    } else if (opts.command !== "review") {
      throw new Error(`unexpected argument: ${arg} (${opts.command} accepts options only)`);
    } else if (opts.spec === undefined) {
      opts.spec = arg;
    } else if (opts.spec === "browse" && opts.scope === undefined) {
      opts.scope = arg;
    } else {
      throw new Error(`unexpected argument: ${arg} (only one ref spec, try --help)`);
    }
  }
  return opts;
}
