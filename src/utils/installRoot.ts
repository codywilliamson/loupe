import { basename, dirname, resolve } from "node:path";

// Compiled Bun executables use a virtual import.meta.dir; their real install root
// is one directory above the binary folder (dist/ or an MCPB server/ directory).
export function installationRoot(sourceRoot: string): string {
  const executable = basename(process.execPath).toLowerCase();
  return executable.startsWith("loupe") ? resolve(dirname(process.execPath), "..") : resolve(sourceRoot);
}
