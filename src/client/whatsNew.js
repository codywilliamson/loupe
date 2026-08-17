// curated "what's new" highlights, newest first. edit this each release to spotlight features.
// dependency-free (no /preact.js import) so the selectors are unit-testable under bun test.

export const WHATS_NEW = [
  {
    version: "0.11.0",
    date: "2026-08-17",
    items: [
      {
        title: "Your .review file stays out of the review",
        body: "A .review committed before you ever ran loupe used to show up as a reviewable file in branch, range, staged and browse mode — it's hidden in every mode now. loupe also keeps it out of git via .git/info/exclude instead of .gitignore, so hiding it no longer edits a tracked file mid-review.",
      },
      {
        title: "Settings menu",
        body: "A gear in the top bar, starting with a toggle to review the .review file anyway. Settings live in ~/.loupe/state.json, so they stick across launches even though each one picks a fresh port.",
      },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-07-05",
    items: [
      {
        title: "Large diffs are fast now",
        body: "File bodies render lazily as you scroll and interactions only re-render the file you're touching — a 150-file, 40k-line diff paints in seconds instead of freezing the tab.",
      },
      {
        title: "Giant files load on demand",
        body: "Files over 2,000 diff lines start collapsed behind a Load diff button, so one huge lockfile can't slow the rest of the review.",
      },
    ],
  },
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
