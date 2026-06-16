// root component: owns diff + comments + viewed + view prefs, coordinates saves, renders the layout.
import { html, render, useState, useEffect, useMemo, useCallback } from "/preact.js";
import { getDiff, getComments, saveComments, saveViewed } from "/api.js";
import { fileAnchorId, clamp } from "/util.js";
import { initTheme, nextTheme } from "/theme.js";
import { usePersistedState } from "/prefs.js";
import { useUpdateCheck } from "/update.js";
import { useShortcuts } from "/shortcuts.js";
import { TopBar } from "/topBar.js";
import { FileTree } from "/fileTree.js";
import { Resizer } from "/resizer.js";
import { DiffView } from "/diffView.js";
import { CompileModal } from "/compileModal.js";
import { HelpOverlay } from "/helpOverlay.js";
import { LoadingScreen } from "/loadingScreen.js";

function App() {
  const [diff, setDiff] = useState(null);
  const [comments, setComments] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [adding, setAdding] = useState(null); // {file, line|null, endLine?} while composing
  const [selecting, setSelecting] = useState(null); // {file, from, to} during a drag-select
  const [showCompile, setShowCompile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => initTheme());
  const [sidebarWidth, setSidebarWidth] = usePersistedState("loupe-sidebar", 280, Number);
  const [splitView, setSplitView] = usePersistedState("loupe-split", false, (v) => v === "true");
  const [viewMode, setViewMode] = usePersistedState("loupe-view", "all"); // "all" | "single"
  const [activeFile, setActiveFile] = useState(null); // path shown in single-file view
  const [refreshing, setRefreshing] = useState(false);
  const update = useUpdateCheck();

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
      const comment = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...partial };
      persistComments([...comments, comment]);
    },
    [comments, persistComments]
  );

  const onEdit = useCallback(
    (id, text, tag) => persistComments(comments.map((c) => (c.id === id ? { ...c, text, tag } : c))),
    [comments, persistComments]
  );

  const onDelete = useCallback(
    (id) => persistComments(comments.filter((c) => c.id !== id)),
    [comments, persistComments]
  );

  // resolve keeps the comment but drops it from the prompt + open counts; toggles back on reopen.
  const onResolve = useCallback(
    (id) => persistComments(comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))),
    [comments, persistComments]
  );

  const onToggleViewed = useCallback(
    (path) => {
      const next = viewed.includes(path) ? viewed.filter((p) => p !== path) : [...viewed, path];
      setViewed(next);
      saveViewed(next).catch((e) => setError(String(e)));
    },
    [viewed]
  );

  // selecting tracks the current file in both modes; all-files view also scrolls to it.
  const onSelectFile = useCallback(
    (path) => {
      setActiveFile(path);
      if (viewMode !== "single")
        document.getElementById(fileAnchorId(path))?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [viewMode]
  );

  const onToggleTheme = useCallback(() => setTheme((t) => nextTheme(t)), []);
  const onToggleSplit = useCallback(() => setSplitView((v) => !v), [setSplitView]);
  const onToggleView = useCallback(() => setViewMode((m) => (m === "single" ? "all" : "single")), [setViewMode]);

  // re-fetch the (server-recomputed) diff in place, preserving comments + open files.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setDiff(await getDiff());
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const onResize = useCallback((x) => setSidebarWidth(clamp(x, 180, 640)), [setSidebarWidth]);

  const viewedSet = useMemo(() => new Set(viewed), [viewed]);
  const countFor = useCallback((path) => comments.filter((c) => c.file === path && !c.resolved).length, [comments]);

  useShortcuts({
    files: diff?.files ?? [],
    activeFile,
    selectFile: onSelectFile,
    toggleViewed: onToggleViewed,
    toggleSplit: onToggleSplit,
    toggleView: onToggleView,
    cycleTheme: onToggleTheme,
    refresh: onRefresh,
    compile: () => setShowCompile(true),
    toggleHelp: () => setShowHelp((v) => !v),
    closeOverlays: () => {
      setShowHelp(false);
      setShowCompile(false);
      setAdding(null);
    },
  });

  if (error) return html`<div class="fatal">${error}</div>`;
  if (!diff) return html`<${LoadingScreen} />`;

  return html`<div class="app">
    <${TopBar}
      refLabel=${diff.ref}
      meta=${diff.meta}
      files=${diff.files}
      theme=${theme}
      refreshing=${refreshing}
      viewMode=${viewMode}
      splitView=${splitView}
      update=${update}
      onRefresh=${onRefresh}
      onToggleTheme=${onToggleTheme}
      onToggleView=${onToggleView}
      onToggleSplit=${onToggleSplit}
      onCompile=${() => setShowCompile(true)}
      onHelp=${() => setShowHelp(true)}
    />
    <div class="body">
      <${FileTree}
        files=${diff.files}
        viewedSet=${viewedSet}
        countFor=${countFor}
        activeFile=${activeFile}
        onSelect=${onSelectFile}
        onToggleViewed=${onToggleViewed}
        width=${sidebarWidth}
      />
      <${Resizer} onResize=${onResize} />
      <${DiffView}
        files=${diff.files}
        viewMode=${viewMode}
        activeFile=${activeFile}
        splitView=${splitView}
        comments=${comments}
        adding=${adding}
        setAdding=${setAdding}
        selecting=${selecting}
        setSelecting=${setSelecting}
        onAdd=${onAdd}
        onEdit=${onEdit}
        onDelete=${onDelete}
        onResolve=${onResolve}
      />
    </div>
    ${showCompile &&
    html`<${CompileModal}
      onClose=${() => setShowCompile(false)}
      comments=${comments}
      diff=${diff}
      onEdit=${onEdit}
      onDelete=${onDelete}
      onResolve=${onResolve}
    />`}
    ${showHelp && html`<${HelpOverlay} onClose=${() => setShowHelp(false)} />`}
  </div>`;
}

render(html`<${App} />`, document.getElementById("root"));
