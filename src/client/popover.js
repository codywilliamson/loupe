// shared popover dismissal: close on outside click or Escape, only while open.
import { useEffect } from "/preact.js";

// open popovers, oldest first — only the topmost (last) one reacts to Escape,
// so stacked popovers (e.g. review popover + overflow menu) close one at a time.
const openStack = [];

export function useDismissablePopover({ isOpen, close, panelRef }) {
  useEffect(() => {
    if (!isOpen) return;
    openStack.push(close);
    const onPointerDown = (e) => { if (!panelRef.current?.contains(e.target)) close(); };
    // capture phase: run before shortcuts.js's document-level Escape handler, then stop it.
    const onKeyDown = (e) => {
      if (e.key !== "Escape" || openStack[openStack.length - 1] !== close) return;
      close();
      e.stopPropagation();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
      const at = openStack.indexOf(close);
      if (at !== -1) openStack.splice(at, 1);
    };
  }, [isOpen]);
}
