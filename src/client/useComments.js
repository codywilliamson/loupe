// owns the review comments array + its mutations, persisting each change (full-replace
// contract) then trusting local state. extracted from app.js to keep the orchestrator lean.
import { useState, useCallback } from "/preact.js";
import { saveComments } from "/api.js";

export function useComments(onError) {
  const [comments, setComments] = useState([]);

  const persist = useCallback(
    (next) => {
      setComments(next);
      saveComments(next).catch((e) => onError(String(e)));
    },
    [onError]
  );

  const onAdd = useCallback(
    (partial) => persist([...comments, { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...partial }]),
    [comments, persist]
  );

  const onEdit = useCallback(
    (id, text, tag) => persist(comments.map((c) => (c.id === id ? { ...c, text, tag } : c))),
    [comments, persist]
  );

  const onDelete = useCallback((id) => persist(comments.filter((c) => c.id !== id)), [comments, persist]);

  // resolve keeps the comment but drops it from the prompt + open counts; toggles back on reopen.
  const onResolve = useCallback(
    (id) => persist(comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c))),
    [comments, persist]
  );

  return { comments, setComments, onAdd, onEdit, onDelete, onResolve };
}
