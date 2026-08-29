#!/usr/bin/env bun
import { join } from "node:path";
import { createReviewOperations } from "./reviewOperations";
import { configuredRoots, serveMcp } from "./stdio";
import { currentVersion } from "../core/updateCheck";
import { installationRoot } from "../utils/installRoot";

export async function runMcpServer(cwd = process.cwd()): Promise<void> {
  const loupeRoot = installationRoot(join(import.meta.dir, "..", ".."));
  await serveMcp(createReviewOperations(loupeRoot), configuredRoots(cwd), currentVersion(loupeRoot));
}

if (import.meta.main) await runMcpServer();
