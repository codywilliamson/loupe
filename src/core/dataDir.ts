// resolves the user data directory, honoring LOUPE_DATA_DIR. shared by review records and sessions.

import { homedir } from "node:os";
import { join } from "node:path";

export function dataDir(): string {
  return process.env.LOUPE_DATA_DIR ?? join(homedir(), ".loupe");
}
