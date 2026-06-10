// cli argument parsing for the loupe entry point. pure — no io, fully unit-tested.

export interface CliOptions {
  spec: string | undefined; // ref spec; absent = working tree vs HEAD
  port: number; // 0 = any free port
  open: boolean; // open the browser once serving
  help: boolean;
  version: boolean;
}

export const USAGE = `loupe — local git diff review with inline comments and LLM prompt export

Usage
  loupe [ref] [options]

Refs
  (none)            working tree vs HEAD, untracked files included
  staged            staged changes only
  <branch>          current branch vs <branch> (pr-style three-dot)
  <ref1>..<ref2>    commit range

Options
  -p, --port <n>    serve on a fixed port (default: any free port)
      --no-open     don't open the browser automatically
  -v, --version     print the installed version
  -h, --help        show this help

Comments are saved to .review in the current directory and compile into a
structured review prompt from the UI.`;

const MAX_PORT = 65535;

// maps argv (already sliced past the runtime + script) into options.
// throws a user-facing message on unknown flags or a bad port.
export function parseCliArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { spec: undefined, port: 0, open: true, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg === "-v" || arg === "--version") opts.version = true;
    else if (arg === "--no-open") opts.open = false;
    else if (arg === "-p" || arg === "--port") {
      const raw = argv[++i];
      const port = Number(raw);
      if (!raw || !Number.isInteger(port) || port < 1 || port > MAX_PORT) {
        throw new Error(`--port needs a number between 1 and ${MAX_PORT} (got ${raw ?? "nothing"})`);
      }
      opts.port = port;
    } else if (arg.startsWith("-")) {
      throw new Error(`unknown option: ${arg} (try --help)`);
    } else if (opts.spec === undefined) {
      opts.spec = arg;
    } else {
      throw new Error(`unexpected argument: ${arg} (only one ref spec, try --help)`);
    }
  }
  return opts;
}
