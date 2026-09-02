// Records a real Loupe -> Claude Code -> Loupe review loop for the docs.
import { chromium } from "playwright";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = join(root, "out", "agent-walkthrough");
const repo = join(work, "repo");
const data = join(work, "loupe-data");
const rawVideo = join(work, "video");
const agentCache = join(root, "out", "agent-walkthrough-agent-cache");
const shots = join(root, "docs", "screenshots");
const port = 43127;
const gifSlowdown = 2;
const candidateReminder = `import type { Order } from "./orders";

export async function loadOrders(endpoint: string): Promise<Order[]> {
  const response = await fetch(endpoint);
  return response.json() as Promise<Order[]>;
}
`;
const baselineOrders = `export interface Order { id: string; subtotal: number; status: "open" | "paid"; }

export function openOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.status === "open");
}
`;
const ordersTest = `import { describe, expect, it } from "bun:test";
import { openOrders } from "../src/orders";

describe("openOrders", () => {
  it("keeps only open orders", () => {
    expect(openOrders([{ id: "a", subtotal: 20, status: "open" }, { id: "b", subtotal: 30, status: "paid" }]))
      .toEqual([{ id: "a", subtotal: 20, status: "open" }]);
  });
});
`;

const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: "utf8", ...options });
const git = (...args) => run("git", args, { cwd: repo });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const escapeHtml = (value) => value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]);

function seedRepo() {
  rmSync(work, { recursive: true, force: true }); mkdirSync(repo, { recursive: true }); mkdirSync(rawVideo, { recursive: true });
  write(join(repo, "package.json"), `{"name":"loupe-agent-demo","private":true,"type":"module","scripts":{"test":"bun test"}}\n`);
  write(join(repo, "README.md"), "# Order desk\n\nA tiny order queue for the Loupe agent walkthrough.\n");
  write(join(repo, "src", "orders.ts"), baselineOrders); write(join(repo, "tests", "orders.test.ts"), ordersTest);
  git("init", "-q", "-b", "main"); git("config", "user.name", "Loupe Demo"); git("config", "user.email", "demo@loupe.local");
  git("add", "-A"); git("commit", "-q", "-m", "chore: establish order desk baseline"); write(join(repo, "src", "reminders.ts"), candidateReminder);
}

function runClaude() {
  const cached = ["result.txt", "reminders-source.txt", "reminders-test.txt"].map((name) => join(agentCache, name));
  if (cached.every(existsSync)) return { message: readFileSync(cached[0], "utf8"), reminder: readFileSync(cached[1], "utf8"), test: readFileSync(cached[2], "utf8") };
  const prompt = `Apply this Loupe review feedback with the smallest safe change.
File: src/reminders.ts. Comment: Handle non-2xx responses before parsing JSON.
Edit src/reminders.ts, add tests/reminders.test.ts for success and failure responses, run bun test, and do not commit.`;
  const result = run("claude", ["-p", prompt, "--model", "sonnet", "--effort", "low", "--max-budget-usd", "1.00", "--output-format", "json", "--no-session-persistence", "--permission-mode", "acceptEdits", "--allowedTools", "Read,Edit,Bash"], { cwd: repo });
  if (result.status !== 0) throw new Error(`Claude Code failed: ${result.stderr}\n${result.stdout}`);
  const parsed = JSON.parse(result.stdout); const reminder = readFileSync(join(repo, "src", "reminders.ts"), "utf8"); const test = readFileSync(join(repo, "tests", "reminders.test.ts"), "utf8");
  if (!reminder.includes("response.ok")) throw new Error("Claude did not add response.ok handling");
  const fixed = { message: parsed.result ?? "Applied the feedback and ran the tests.", reminder, test };
  mkdirSync(agentCache, { recursive: true }); writeFileSync(cached[0], fixed.message); writeFileSync(cached[1], reminder); writeFileSync(cached[2], test); return fixed;
}

async function waitForLoupe() {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://localhost:${port}/api/diff`)).ok) return; } catch {} await wait(100); }
  throw new Error("Loupe did not start");
}

// injected over the live app (not page.setContent) so the review-sync poll keeps running
// underneath — the recording needs the real .sync-notice to appear after the overlay lifts.
function terminalHtml(message) {
  return `<style>#agent-terminal-overlay{position:fixed;inset:0;z-index:99999;background:#181817;color:#eceae2;font:18px/1.6 "Cascadia Code",Consolas,monospace}#agent-terminal-overlay main{padding:58px 72px}#agent-terminal-overlay .bar{color:#888;margin-bottom:28px}#agent-terminal-overlay .prompt{color:#d97757}#agent-terminal-overlay .ok{color:#8fbc72}#agent-terminal-overlay pre{white-space:pre-wrap;max-width:72ch}</style><main><div class="bar">Claude Code · loupe-agent-demo</div><pre><span class="prompt">$</span> claude -p "Apply the Loupe feedback and run tests"

${escapeHtml(message.slice(0, 700))}

<span class="ok">✓ feedback addressed · tests passed · rereview requested</span></pre></main>`;
}
async function showOverlay(page, html) {
  await page.evaluate((html) => { const el = document.createElement("div"); el.id = "agent-terminal-overlay"; el.innerHTML = html; document.body.appendChild(el); }, html);
}
async function hideOverlay(page) {
  await page.evaluate(() => document.getElementById("agent-terminal-overlay")?.remove());
}

function updateReview(reviewId) {
  const record = JSON.parse(readFileSync(join(data, "reviews", reviewId, "review.json"), "utf8")); const commentId = record.comments[0].id;
  const code = `import { replyToComment, markCommentAddressed, requestRereview } from './src/core/reviewRecords.ts'; replyToComment('${reviewId}','${commentId}','Added response.ok handling and success/failure tests.','agent'); markCommentAddressed('${reviewId}','${commentId}'); requestRereview('${reviewId}');`;
  const result = run("bun", ["-e", code], { cwd: root, env: { ...process.env, LOUPE_DATA_DIR: data } }); if (result.status !== 0) throw new Error(result.stderr);
}

async function convert(video) {
  const webm = join(shots, "agent-review-walkthrough.webm"); const mp4 = join(shots, "agent-review-walkthrough.mp4"); const gif = join(shots, "agent-review-walkthrough.gif"); copyFileSync(video, webm);
  const mp4Result = run("ffmpeg", ["-y", "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  const gifResult = run("ffmpeg", ["-y", "-i", webm, "-vf", `setpts=${gifSlowdown}*PTS,fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`, gif]);
  if (mp4Result.status !== 0 || gifResult.status !== 0) throw new Error("media conversion failed");
}

async function main() {
  seedRepo(); const fixed = runClaude(); console.log("Claude Code applied and tested the feedback."); write(join(repo, "src", "reminders.ts"), candidateReminder); rmSync(join(repo, "tests", "reminders.test.ts"), { force: true });
  const server = spawn("bun", [join(root, "src", "index.ts"), "--no-open", "--port", String(port)], { cwd: repo, env: { ...process.env, LOUPE_DATA_DIR: data }, stdio: "ignore" }); let browser;
  try {
    await waitForLoupe(); const reviewId = readdirSync(join(data, "reviews"))[0]; const url = `http://localhost:${port}/?review=${reviewId}`; console.log("Loupe review started.");
    browser = await chromium.launch({ headless: true, slowMo: 90, args: ["--ignore-certificate-errors"] }); const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: "dark", ignoreHTTPSErrors: true, recordVideo: { dir: rawVideo, size: { width: 1280, height: 720 } } });
    const page = await context.newPage(); page.on("console", (message) => message.type() === "error" && console.error(`browser: ${message.text()}`)); await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 }); await page.locator(".top-bar").waitFor({ timeout: 20_000 }); const got = page.getByRole("button", { name: "Got it" }); if (await got.isVisible()) await got.click();
    await page.locator('.tree-file-name[title="src/reminders.ts"]').click(); const row = page.getByRole("row").filter({ hasText: "return response.json()" }); await row.getByRole("button", { name: /Comment/ }).click(); await page.getByPlaceholder("Leave a comment…").fill("Handle non-2xx responses before parsing JSON."); await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator(".review-trigger").click(); await page.getByPlaceholder("Optional reviewer summary").fill("Harden the reminder API before shipping."); await page.getByRole("button", { name: "Return Feedback" }).click(); await wait(700);
    await showOverlay(page, terminalHtml(fixed.message)); await wait(2200); write(join(repo, "src", "reminders.ts"), fixed.reminder); write(join(repo, "tests", "reminders.test.ts"), fixed.test); updateReview(reviewId); await hideOverlay(page);
    const notice = page.locator(".sync-notice"); await notice.waitFor({ timeout: 8_000 }); await wait(900); await notice.getByRole("button", { name: "Refresh diff" }).click(); await wait(700);
    const card = page.getByText("Handle non-2xx responses before parsing JSON.", { exact: true }).locator("..");
    await card.getByRole("button", { name: "Reply" }).click(); await page.getByPlaceholder("Reply…").fill("Looks good — thanks for the fix."); await page.getByRole("button", { name: "Send", exact: true }).click(); await wait(700);
    await card.getByRole("button", { name: "Resolve" }).click(); await page.locator(".review-trigger").click(); await page.getByRole("button", { name: "Approve", exact: true }).click(); await wait(1600);
    await page.screenshot({ path: join(shots, "agent-review-walkthrough.png") }); const video = page.video(); await context.close(); await convert(await video.path()); console.log("Walkthrough media generated.");
  } finally { if (browser) await browser.close(); server.kill(); }
}

await main();
