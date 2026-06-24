// root component: owns diff + comments + viewed + view prefs, coordinates saves, renders the layout.
import { html, render, useState, useEffect, useMemo, useCallback } from "/preact.js";
import { getDiff, getComments, saveViewed } from "/api.js";
import { useComments } from "/useComments.js";
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
import { useWhatsNew, WhatsNewModal } from "/whatsNewModal.js";
import { LoadingScreen } from "/loadingScreen.js";

function App() {
  const [diff, setDiff] = useState(null);
  const [viewed, setViewed] = useState([]);
  const [adding, setAdding] = useState(null); // {file, line|null, endLine?} while composing
  const [selecting, setSelecting] = useState(null); // {file, from, to} during a drag-select
  const [showCompile, setShowCompile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => initTheme());
  const [sidebarWidth, setSidebarWidth] = usePersistedState("loupe-sidebar", 280, Number);
  const [splitView, setSplitView] = usePersistedState("loupe-split", false, (v) => v === "true");
  const [wrap, setWrap] = usePersistedState("loupe-wrap", false, (v) => v === "true");
  const [viewMode, setViewMode] = usePersistedState("loupe-view", "all"); // "all" | "single"
  const [activeFile, setActiveFile] = useState(null); // path shown in single-file view
  const [refreshing, setRefreshing] = useState(false);
  const update = useUpdateCheck();
  const { comments, setComments, onAdd, onEdit, onDelete, onResolve } = useComments(setError);
  const wn = useWhatsNew(update?.current);

  useEffect(() => {
    Promise.all([getDiff(), getComments()])
      .then(([d, review]) => {
        setDiff(d);
        setComments(review.comments);
        setViewed(review.viewed);
      })
      .catch((e) => setError(String(e)));
  }, []);

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
  const onToggleWrap = useCallback(() => setWrap((w) => !w), [setWrap]);
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
    toggleWrap: onToggleWrap,
    toggleView: onToggleView,
    cycleTheme: onToggleTheme,
    refresh: onRefresh,
    compile: () => setShowCompile(true),
    whatsNew: wn.reopen,
    toggleHelp: () => setShowHelp((v) => !v),
    closeOverlays: () => {
      setShowHelp(false);
      setShowCompile(false);
      setAdding(null);
      wn.close();
    },
  });

  if (error) return html`<div class="fatal">${error}</div>`;
  if (!diff) return html`<${LoadingScreen} />`;

  const browse = diff.meta?.mode === "browse";

  return html`<div class="app${browse ? " browse" : ""}">
    <${TopBar}
      refLabel=${diff.ref}
      meta=${diff.meta}
      files=${diff.files}
      theme=${theme}
      refreshing=${refreshing}
      viewMode=${viewMode}
      splitView=${splitView}
      wrap=${wrap}
      update=${update}
      onRefresh=${onRefresh}
      onToggleTheme=${onToggleTheme}
      onToggleView=${onToggleView}
      onToggleSplit=${onToggleSplit}
      onToggleWrap=${onToggleWrap}
      onCompile=${() => setShowCompile(true)}
      onHelp=${() => setShowHelp(true)}
      onWhatsNew=${wn.reopen}
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
        browse=${browse}
      />
      <${Resizer} onResize=${onResize} />
      <${DiffView}
        files=${diff.files}
        viewMode=${viewMode}
        activeFile=${activeFile}
        splitView=${splitView && !browse}
        browse=${browse}
        wrap=${wrap}
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
    ${wn.open && html`<${WhatsNewModal} entry=${wn.entry} onClose=${wn.close} />`}
  </div>`;
}

render(html`<${App} />`, document.getElementById("root"));
