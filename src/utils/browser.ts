// opens a URL in the user's default browser without invoking a shell on Unix.
export function openBrowser(url: string): void {
  const command = process.platform === "win32"
    ? ["cmd", "/c", "start", "", url]
    : process.platform === "darwin" ? ["open", url] : ["xdg-open", url];
  try { Bun.spawn(command, { stdout: "ignore", stderr: "ignore" }); } catch { /* best effort */ }
}
