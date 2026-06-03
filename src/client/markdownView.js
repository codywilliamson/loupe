// renders a markdown file's new-side content. the default view for .md files;
// fetches the full file via /api/file (the diff alone only holds changed hunks).
import { html, useState, useEffect } from "/preact.js";
import { marked } from "https://esm.sh/marked@12";
import { getFile } from "/api.js";

export function MarkdownView({ path }) {
  const [rendered, setRendered] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setRendered(null);
    setFailed(false);
    getFile(path)
      .then((r) => live && setRendered(marked.parse(r.content ?? "")))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [path]);

  if (failed) return html`<div class="md-note">Couldn't load <code>${path}</code> for preview.</div>`;
  if (rendered === null) return html`<div class="md-note">Rendering…</div>`;
  return html`<div class="markdown-body" dangerouslySetInnerHTML=${{ __html: rendered }}></div>`;
}
