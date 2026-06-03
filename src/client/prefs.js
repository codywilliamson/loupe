// useState mirrored to localStorage. parse() reads the stored string, serialize() writes it.
// keeps view preferences (sidebar width, split mode, view mode) sticky across reloads.
import { useState, useCallback } from "/preact.js";

export function usePersistedState(key, fallback, parse = (v) => v, serialize = String) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : parse(raw);
  });
  const set = useCallback(
    (next) =>
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        localStorage.setItem(key, serialize(resolved));
        return resolved;
      }),
    [key]
  );
  return [value, set];
}
