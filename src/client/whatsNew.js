// curated "what's new" highlights, newest first. edit this each release to spotlight features.
// dependency-free (no /preact.js import) so the selectors are unit-testable under bun test.

export const WHATS_NEW = [
  {
    version: "0.9.0",
    date: "2026-06-23",
    items: [
      {
        title: "Codebase browse mode",
        body: "Run loupe browse to review the whole codebase — not just a diff. Read any file, leave inline questions, and compile them into a prompt to onboard an LLM (or yourself).",
      },
      {
        title: "What's new, in-app",
        body: "This modal — loupe now greets you with the highlights after each update.",
      },
    ],
  },
];

// the curated entry for an exact version, or null.
export function whatsNewFor(version) {
  return WHATS_NEW.find((entry) => entry.version === version) ?? null;
}

// auto-show only when running a version that has highlights you haven't seen yet.
export function shouldAutoShow(current, seen) {
  return Boolean(current) && current !== seen && whatsNewFor(current) !== null;
}
