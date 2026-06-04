// renders diff rows (unified + side-by-side) with hover bubble gutter and inline comment slots.
import { html } from "/preact.js";
import { highlightLine } from "/highlight.js";
import { Bubble } from "/icons.js";
import { CommentThread, CommentEditor } from "/comments.js";

const SIGN = { addition: "+", deletion: "-", context: " " };

// code cell with syntax highlighting injected as html.
function Code({ line, path }) {
  const inner = highlightLine(line.content, path);
  return html`<td class="code code-${line.type}">
    <span class="sign">${SIGN[line.type]}</span><span
      class="code-inner"
      dangerouslySetInnerHTML=${{ __html: inner }}
    ></span>
  </td>`;
}

// cell spans [lead, cell, trail] so the comment box sits under the pane it belongs to:
// unified = box under the code column; split = box under the old (left) or new (right) pane.
function commentLayout(variant, side) {
  if (variant === "split") return side === "old" ? [0, 3, 3] : [3, 3, 0];
  return [3, 1, 0];
}

// the per-row comment region: one comment row PER anchor, aligned under its side, with the
// existing thread + an inline editor when adding here. anchors are {side, line, lineObj}.
function LineComments({ anchors, threads, variant = "unified" }) {
  return anchors.map((a) => {
    const list = threads.commentsForLine(a.side, a.line);
    const adding = threads.isAddingAt(a.side, a.line);
    if (list.length === 0 && !adding) return null;
    const [lead, cell, trail] = commentLayout(variant, a.side);
    return html`<tr class="comment-row">
      ${lead > 0 && html`<td class="gutter" colspan=${lead}></td>`}
      <td class="comment-cell" colspan=${cell}>
        ${list.length > 0 &&
        html`<${CommentThread} comments=${list} onEdit=${threads.onEdit} onDelete=${threads.onDelete} />`}
        ${adding &&
        html`<${CommentEditor}
          onSave=${(text) => threads.onAdd(a.side, a.lineObj, text)}
          onCancel=${threads.onCancelAdd}
        />`}
      </td>
      ${trail > 0 && html`<td class="gutter" colspan=${trail}></td>`}
    </tr>`;
  });
}

// press a bubble to comment one line; drag to select a range; shift-click to extend an open one.
// `side` ("old"/"new") scopes the selection so a drag only spans rows commentable on that side.
function startSelect(e, side, anchor, threads) {
  e.preventDefault();
  if (e.shiftKey) return threads.onExtendAdd(side, anchor);
  let head = anchor;
  const section = e.currentTarget.closest(".file-section");
  const attr = side === "old" ? "oldline" : "newline";
  threads.onSelectMove(side, anchor, anchor);
  const move = (ev) => {
    const row = document.elementFromPoint(ev.clientX, ev.clientY)?.closest("tr.diff-row");
    const n = row && section.contains(row) ? row.dataset[attr] : "";
    if (n) {
      head = Number(n);
      threads.onSelectMove(side, anchor, head);
    }
  };
  const stop = () => {
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", stop);
    document.body.classList.remove("selecting");
    threads.onSelectCommit(side, Math.min(anchor, head), Math.max(anchor, head));
  };
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", stop);
  document.body.classList.add("selecting");
}

// one unified row plus its comment region. the bubble is ALWAYS rendered (hidden via
// css until row hover) so the gutter column never resizes — no layout jump on hover.
// two root nodes: htm returns them as an array, preact renders them as siblings
// (a fragment shorthand <>…</> isn't registered on this raw htm.bind(h) and breaks).
function UnifiedRow({ line, path, threads }) {
  // additions + context anchor on the new side; deletions anchor on the old side.
  const newLine = line.newLine;
  const oldLine = line.type === "deletion" ? line.oldLine : null;
  const side = newLine != null ? "new" : oldLine != null ? "old" : null;
  const anchor = newLine != null ? newLine : oldLine;
  const commentable = anchor != null;
  const selected = commentable && threads.pendingAt(side, anchor);
  const inRange = commentable && threads.rangeAt(side, anchor);
  const cls = `diff-row row-${line.type}${selected ? " range-selected" : ""}${inRange ? " in-range" : ""}`;
  return html`
    <tr class="${cls}" data-newline=${newLine ?? ""} data-oldline=${oldLine ?? ""}>
      <td class="bubble-gutter">
        ${commentable &&
        html`<button class="bubble-btn" title="Comment — drag or shift-click to select a range" onMouseDown=${(e) => startSelect(e, side, anchor, threads)}><${Bubble} /></button>`}
      </td>
      <td class="lineno old-no">${line.oldLine ?? ""}</td>
      <td class="lineno new-no">${line.newLine ?? ""}</td>
      <${Code} line=${line} path=${path} />
    </tr>
    <${LineComments} anchors=${commentable ? [{ side, line: anchor, lineObj: line }] : []} threads=${threads} />
  `;
}

export function UnifiedHunk({ hunk, path, threads }) {
  return html`<tbody>
    <tr class="hunk-header">
      <td colspan="4"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>
    ${hunk.lines.map(
      (l, i) => html`<${UnifiedRow} key=${i} line=${l} path=${path} threads=${threads} />`
    )}
  </tbody>`;
}

// pair deletions with additions for side-by-side; context spans both columns.
function pairLines(lines) {
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

function Side({ line, path, side }) {
  if (!line) return html`<td class="lineno ${side}-no empty"></td><td class="code code-empty"></td>`;
  const no = side === "old" ? line.oldLine : line.newLine;
  return html`<td class="lineno ${side}-no">${no ?? ""}</td><${Code} line=${line} path=${path} />`;
}

// one side-by-side row: an old-side bubble (removed lines) + the old cells, then a new-side
// bubble (added/context) + the new cells, then the comment region for either anchor.
function SplitRow({ left, right, path, threads }) {
  const newLine = right && right.newLine != null ? right.newLine : null;
  const oldLine = left && left.type === "deletion" ? left.oldLine : null;
  const oldSel = oldLine != null && (threads.pendingAt("old", oldLine) || threads.rangeAt("old", oldLine));
  const newSel = newLine != null && (threads.pendingAt("new", newLine) || threads.rangeAt("new", newLine));
  const cls = `diff-row split${oldSel || newSel ? " range-selected" : ""}`;
  const anchors = [];
  if (oldLine != null) anchors.push({ side: "old", line: oldLine, lineObj: left });
  if (newLine != null) anchors.push({ side: "new", line: newLine, lineObj: right });
  return html`
    <tr class="${cls}" data-newline=${newLine ?? ""} data-oldline=${oldLine ?? ""}>
      <td class="bubble-gutter">
        ${oldLine != null &&
        html`<button class="bubble-btn" title="Comment on the removed line — drag or shift-click for a range" onMouseDown=${(e) => startSelect(e, "old", oldLine, threads)}><${Bubble} /></button>`}
      </td>
      <${Side} line=${left} path=${path} side="old" />
      <td class="bubble-gutter">
        ${newLine != null &&
        html`<button class="bubble-btn" title="Comment on the new line — drag or shift-click for a range" onMouseDown=${(e) => startSelect(e, "new", newLine, threads)}><${Bubble} /></button>`}
      </td>
      <${Side} line=${right} path=${path} side="new" />
    </tr>
    <${LineComments} anchors=${anchors} threads=${threads} variant="split" />
  `;
}

export function SplitHunk({ hunk, path, threads }) {
  const rows = pairLines(hunk.lines);
  return html`<tbody>
    <tr class="hunk-header">
      <td colspan="6"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>
    ${rows.map(
      (r, i) => html`<${SplitRow} key=${i} left=${r.left} right=${r.right} path=${path} threads=${threads} />`
    )}
  </tbody>`;
}
