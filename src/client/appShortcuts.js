// wires global keyboard shortcuts to the app's callbacks — split out of app.js to stay under the line cap.
import { useShortcuts } from "/shortcuts.js";

export function useAppShortcuts({
  diff, activeFile, onSelectFile, onToggleViewed, onToggleSplit, onToggleWrap, onToggleView,
  onToggleTheme, onRefresh, wn, setShowCompile, setShowHelp, setAdding,
}) {
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
}
