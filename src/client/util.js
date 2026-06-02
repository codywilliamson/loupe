// small shared helpers used across components. no preact, no dom.

const BADGE = { added: "A", modified: "M", deleted: "D", renamed: "R" };
export function changeBadge(t) {
  return BADGE[t] ?? "?";
}

// "+N -N" aggregate across files.
export function totalDelta(files) {
  let add = 0;
  let del = 0;
  for (const f of files) {
    add += f.additions;
    del += f.deletions;
  }
  return { add, del };
}

// relative timestamp like "5m ago", "2h ago", "3d ago", else a date.
const UNITS = [
  ["y", 31536000],
  ["mo", 2592000],
  ["d", 86400],
  ["h", 3600],
  ["m", 60],
];
export function relativeTime(iso) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 45) return "just now";
  for (const [label, span] of UNITS) {
    const n = Math.floor(secs / span);
    if (n >= 1) return `${n}${label} ago`;
  }
  return "just now";
}

// map a file extension to a highlight.js language hint.
const LANGS = {
  ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
  mjs: "javascript", cjs: "javascript", json: "json", css: "css",
  scss: "scss", less: "less", html: "xml", xml: "xml", svg: "xml",
  md: "markdown", py: "python", rb: "ruby", go: "go", rs: "rust",
  java: "java", c: "c", h: "c", cpp: "cpp", hpp: "cpp", cs: "csharp",
  php: "php", sh: "bash", bash: "bash", zsh: "bash", yml: "yaml",
  yaml: "yaml", sql: "sql", swift: "swift", kt: "kotlin", toml: "ini",
};
export function langFor(path) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANGS[ext] ?? null;
}

// group files into a nested tree by directory segments.
// returns { name, path, dirs: Map<name,node>, files: DiffFile[] }.
export function buildTree(files) {
  const root = { name: "", path: "", dirs: new Map(), files: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    const name = parts.pop();
    let node = root;
    let acc = "";
    for (const seg of parts) {
      acc = acc ? `${acc}/${seg}` : seg;
      if (!node.dirs.has(seg)) {
        node.dirs.set(seg, { name: seg, path: acc, dirs: new Map(), files: [] });
      }
      node = node.dirs.get(seg);
    }
    node.files.push({ ...file, name });
  }
  return root;
}

// stable dom id for a file section, so the tree can scroll to it.
export function fileAnchorId(path) {
  return "file-" + path.replace(/[^a-zA-Z0-9]/g, "-");
}
