// root component: owns diff + comments + viewed state, coordinates saves, renders the layout.
import { html, render, useState, useEffect, useMemo, useCallback } from "/preact.js";
import { getDiff, getComments, saveComments, saveViewed } from "/api.js";
import { fileAnchorId, clamp } from "/util.js";
import { initTheme, nextTheme } from "/theme.js";
import { TopBar } from "/topBar.js";
import { FileTree } from "/fileTree.js";
import { Resizer } from "/resizer.js";
import { DiffView } from "/diffView.js";
import { CompileModal } from "/compileModal.js";

function App() {
  const [diff, setDiff] = useState(null);
  const [comments, setComments] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [adding, setAdding] = useState(null); // {file, line|null, endLine?} while composing
  const [showCompile, setShowCompile] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => initTheme());
  const [sidebarWidth, setSidebarWidth] = useState(() => Number(localStorage.getItem("loupe-sidebar")) || 280);

  useEffect(() => {
    Promise.all([getDiff(), getComments()])
      .then(([d, review]) => {
        setDiff(d);
        setComments(review.comments);
        setViewed(review.viewed);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // every mutation persists the full array (full-replace contract), then trusts local state.
  const persistComments = useCallback((next) => {
    setComments(next);
    saveComments(next).catch((e) => setError(String(e)));
  }, []);

  const onAdd = useCallback(
    (partial) => {
      const comment = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...partial,
      };
      persistComments([...comments, comment]);
    },
    [comments, persistComments]
  );

  const onEdit = useCallback(
    (id, text) => persistComments(comments.map((c) => (c.id === id ? { ...c, text } : c))),
    [comments, persistComments]
  );

  const onDelete = useCallback(
    (id) => persistComments(comments.filter((c) => c.id !== id)),
    [comments, persistComments]
  );

  const onToggleViewed = useCallback(
    (path) => {
      const next = viewed.includes(path)
        ? viewed.filter((p) => p !== path)
        : [...viewed, path];
      setViewed(next);
      saveViewed(next).catch((e) => setError(String(e)));
    },
    [viewed]
  );

  const onSelectFile = useCallback((path) => {
    document.getElementById(fileAnchorId(path))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onToggleTheme = useCallback(() => setTheme((t) => nextTheme(t)), []);

  const onResize = useCallback((x) => {
    const w = clamp(x, 180, 640);
    setSidebarWidth(w);
    localStorage.setItem("loupe-sidebar", String(w));
  }, []);

  const viewedSet = useMemo(() => new Set(viewed), [viewed]);
  const countFor = useCallback(
    (path) => comments.filter((c) => c.file === path).length,
    [comments]
  );

  if (error) return html`<div class="fatal">${error}</div>`;
  if (!diff) return html`<div class="loading">Loading diff…</div>`;

  return html`<div class="app">
    <${TopBar}
      refLabel=${diff.ref}
      files=${diff.files}
      theme=${theme}
      onToggleTheme=${onToggleTheme}
      onCompile=${() => setShowCompile(true)}
    />
    <div class="body">
      <${FileTree}
        files=${diff.files}
        viewedSet=${viewedSet}
        countFor=${countFor}
        onSelect=${onSelectFile}
        onToggleViewed=${onToggleViewed}
        width=${sidebarWidth}
      />
      <${Resizer} onResize=${onResize} />
      <${DiffView}
        files=${diff.files}
        comments=${comments}
        adding=${adding}
        setAdding=${setAdding}
        onAdd=${onAdd}
        onEdit=${onEdit}
        onDelete=${onDelete}
      />
    </div>
    ${showCompile && html`<${CompileModal} onClose=${() => setShowCompile(false)} />`}
  </div>`;
}

render(html`<${App} />`, document.getElementById("root"));
