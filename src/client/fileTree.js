// left sidebar: filter + viewed progress, files grouped by directory, collapsible folders.
import { html, useState } from "/preact.js";
import { changeBadge, buildTree } from "/util.js";
import { ChevronRight, ChevronDown } from "/icons.js";

// filter box + "viewed n/total" progress over the files in this diff.
function TreeHead({ filter, onFilter, files, viewedSet }) {
  const done = files.filter((f) => viewedSet.has(f.path)).length;
  const pct = files.length ? Math.round((done / files.length) * 100) : 0;
  return html`<div class="tree-head">
    <input
      class="tree-filter"
      type="search"
      placeholder="Filter files…"
      value=${filter}
      onInput=${(e) => onFilter(e.target.value)}
    />
    <div class="tree-progress" title=${`${done} of ${files.length} files viewed`}>
      <div class="tree-progress-bar"><div class="tree-progress-fill" style=${`width:${pct}%`}></div></div>
      <span class="tree-progress-label">${done}/${files.length} viewed</span>
    </div>
  </div>`;
}

function FileRow({ file, viewed, commentCount, active, onSelect, onToggleViewed }) {
  return html`<div class="tree-file ${active ? "active" : ""}" onClick=${() => onSelect(file.path)}>
    <span class="tree-file-name" title=${file.path}>${file.name}</span>
    <span class="badge badge-${file.changeType}">${changeBadge(file.changeType)}</span>
    <span class="tree-delta">
      <span class="add">+${file.additions}</span>
      <span class="del">-${file.deletions}</span>
    </span>
    ${commentCount > 0 && html`<span class="comment-dot" title=${`${commentCount} comment(s)`}></span>`}
    <input
      type="checkbox"
      class="viewed-check"
      title="Viewed"
      checked=${viewed}
      onClick=${(e) => e.stopPropagation()}
      onChange=${() => onToggleViewed(file.path)}
    />
  </div>`;
}

function Folder({ node, depth, ...rest }) {
  const [open, setOpen] = useState(true);
  const subdirs = [...node.dirs.values()];
  return html`<div class="tree-folder">
    <div
      class="tree-folder-head"
      style=${`padding-left:${depth * 12}px`}
      onClick=${() => setOpen(!open)}
    >
      ${open ? html`<${ChevronDown} />` : html`<${ChevronRight} />`}
      <span class="tree-folder-name">${node.name}</span>
    </div>
    ${open &&
    html`<div class="tree-children">
      ${subdirs.map(
        (d) => html`<${Folder} key=${d.path} node=${d} depth=${depth + 1} ...${rest} />`
      )}
      <div class="tree-files" style=${`padding-left:${(depth + 1) * 12}px`}>
        ${node.files.map(
          (f) => html`<${FileRow} key=${f.path} file=${f} ...${rest} viewed=${rest.viewedSet.has(f.path)} commentCount=${rest.countFor(f.path)} active=${rest.activeFile === f.path} />`
        )}
      </div>
    </div>`}
  </div>`;
}

export function FileTree({ files, viewedSet, countFor, activeFile, onSelect, onToggleViewed, width }) {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const shown = needle ? files.filter((f) => f.path.toLowerCase().includes(needle)) : files;
  const root = buildTree(shown);
  const rest = { viewedSet, countFor, activeFile, onSelect, onToggleViewed };
  return html`<nav class="file-tree" style=${`width:${width}px`}>
    <${TreeHead} filter=${filter} onFilter=${setFilter} files=${files} viewedSet=${viewedSet} />
    ${needle && shown.length === 0 && html`<div class="tree-empty">No files match “${filter}”</div>`}
    ${[...root.dirs.values()].map(
      (d) => html`<${Folder} key=${d.path} node=${d} depth=${0} ...${rest} />`
    )}
    <div class="tree-files">
      ${root.files.map(
        (f) => html`<${FileRow}
          key=${f.path}
          file=${f}
          viewed=${viewedSet.has(f.path)}
          commentCount=${countFor(f.path)}
          active=${activeFile === f.path}
          onSelect=${onSelect}
          onToggleViewed=${onToggleViewed}
        />`
      )}
    </div>
  </nav>`;
}
