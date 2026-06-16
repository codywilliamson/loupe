// syntax highlighting via highlight.js (CDN, loaded as a side-effect module).
// the common bundle omits powershell, so register it explicitly.
import hljs from "https://esm.sh/highlight.js@11.10.0/lib/common";
import powershell from "https://esm.sh/highlight.js@11.10.0/lib/languages/powershell";
import { langFor } from "/util.js";

hljs.registerLanguage("powershell", powershell);

// returns highlighted inner html for one line of code, or escaped plain text.
// only highlights when the extension maps to a known language — per-line auto-detection
// (hljs.highlightAuto) is slow on large diffs and guesses inconsistently line-to-line.
export function highlightLine(content, path) {
  if (!content) return "";
  const lang = langFor(path);
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
    } catch {
      // fall through to plain escaped text
    }
  }
  return escapeHtml(content);
}

export function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
