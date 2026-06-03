// left sidebar: files grouped by directory, collapsible folders, live viewed + comment dots.
import { html, useState } from "/preact.js";
import { changeBadge, buildTree } from "/util.js";
import { ChevronRight, ChevronDown } from "/icons.js";

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
  const root = buildTree(files);
  const rest = { viewedSet, countFor, activeFile, onSelect, onToggleViewed };
  return html`<nav class="file-tree" style=${`width:${width}px`}>
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
