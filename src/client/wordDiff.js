// intra-line word diff: pairs deletion/addition runs and computes the changed char
// range inside each modified line pair. pure — no preact, no dom (unit-testable).

// pair deletions with additions for side-by-side rows; context spans both columns.
export function pairLines(lines) {
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.type === "context") {
      rows.push({ left: l, right: l });
      i++;
    } else {
      const dels = [];
      const adds = [];
      while (i < lines.length && lines[i].type === "deletion") dels.push(lines[i++]);
      while (i < lines.length && lines[i].type === "addition") adds.push(lines[i++]);
      const n = Math.max(dels.length, adds.length);
      for (let k = 0; k < n; k++) rows.push({ left: dels[k] ?? null, right: adds[k] ?? null });
    }
  }
  return rows;
}

// split a line into word / whitespace / punctuation tokens.
const TOKEN = /\w+|\s+|[^\w\s]/g;
const tokensOf = (s) => s.match(TOKEN) ?? [];

// char ranges [start, end) of the differing middle of a deletion/addition pair,
// via common token prefix + suffix. null when the lines share no tokens at all
// (a whole-line highlight is noise) or when they are identical.
export function diffRange(oldText, newText) {
  const a = tokensOf(oldText);
  const b = tokensOf(newText);
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let endA = a.length;
  let endB = b.length;
  while (endA > pre && endB > pre && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  if (pre === endA && pre === endB) return null; // identical
  if (pre === 0 && endA === a.length && endB === b.length) return null; // nothing in common
  const len = (arr, from, to) => arr.slice(from, to).join("").length;
  const oldStart = len(a, 0, pre);
  const newStart = len(b, 0, pre);
  return {
    old: { start: oldStart, end: oldStart + len(a, pre, endA) },
    new: { start: newStart, end: newStart + len(b, pre, endB) },
  };
}

// per-line marks for a hunk's lines: Map<line, {start,end}> covering both sides.
export function hunkMarks(lines) {
  const marks = new Map();
  for (const { left, right } of pairLines(lines)) {
    if (!left || !right || left.type !== "deletion" || right.type !== "addition") continue;
    const r = diffRange(left.content, right.content);
    if (!r) continue;
    if (r.old.end > r.old.start) marks.set(left, r.old);
    if (r.new.end > r.new.start) marks.set(right, r.new);
  }
  return marks;
}

// wraps the [start, end) text range of highlighted html in <mark class="cls">,
// closing + reopening the mark across tag boundaries so nesting stays valid.
// entities (&amp; etc.) count as one rendered char; literal "<" only opens tags
// because highlight.js escapes every "<" in code as &lt;.
const PIECE = /<[^>]*>|&[a-zA-Z]+;|&#x?[0-9a-fA-F]+;|[\s\S]/g;

export function markRange(html, start, end, cls) {
  if (start >= end) return html;
  const open = `<mark class="${cls}">`;
  let out = "";
  let pos = 0;
  let marking = false;
  for (const piece of html.match(PIECE) ?? []) {
    if (piece[0] === "<" && piece.length > 1) {
      if (marking) out += "</mark>";
      out += piece;
      if (marking) out += open;
      continue;
    }
    if (pos === start) {
      out += open;
      marking = true;
    }
    if (pos === end && marking) {
      out += "</mark>";
      marking = false;
    }
    out += piece;
    pos++;
  }
  if (marking) out += "</mark>";
  return out;
}
