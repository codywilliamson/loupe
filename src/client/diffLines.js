// renders diff rows (unified + side-by-side) with hover bubble gutter and inline comment slots.
import { html, useState } from "/preact.js";
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

// the per-line comment region: existing thread + an inline editor when adding.
function LineComments({ line, threads }) {
  const list = threads.commentsForLine(line.newLine);
  const adding = threads.addingLine === line.newLine && line.newLine != null;
  if (list.length === 0 && !adding) return null;
  return html`<tr class="comment-row">
    <td class="gutter" colspan="3"></td>
    <td class="comment-cell">
      <${CommentThread} comments=${list} onEdit=${threads.onEdit} onDelete=${threads.onDelete} />
      ${adding &&
      html`<${CommentEditor}
        onSave=${(text) => threads.onAdd(line, text)}
        onCancel=${threads.onCancelAdd}
      />`}
    </td>
  </tr>`;
}

// one unified row plus its comment region.
function UnifiedRow({ line, path, threads }) {
  const [hover, setHover] = useState(false);
  const commentable = line.newLine != null;
  // two root nodes: htm returns them as an array, preact renders them as siblings
  // (a fragment shorthand <>…</> isn't registered on this raw htm.bind(h) and breaks).
  return html`
    <tr
      class="diff-row row-${line.type}"
      onMouseEnter=${() => setHover(true)}
      onMouseLeave=${() => setHover(false)}
    >
      <td class="bubble-gutter">
        ${hover && commentable &&
        html`<button class="bubble-btn" title="Comment" onClick=${() => threads.onStartAdd(line.newLine)}><${Bubble} /></button>`}
      </td>
      <td class="lineno old-no">${line.oldLine ?? ""}</td>
      <td class="lineno new-no">${line.newLine ?? ""}</td>
      <${Code} line=${line} path=${path} />
    </tr>
    <${LineComments} line=${line} threads=${threads} />
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

export function SplitHunk({ hunk, path }) {
  const rows = pairLines(hunk.lines);
  return html`<tbody>
    <tr class="hunk-header">
      <td colspan="4"><span class="hunk-pill">${hunk.header}</span></td>
    </tr>
    ${rows.map(
      (r, i) => html`<tr class="diff-row split">
        <${Side} line=${r.left} path=${path} side="old" />
        <${Side} line=${r.right} path=${path} side="new" />
      </tr>`
    )}
  </tbody>`;
}
