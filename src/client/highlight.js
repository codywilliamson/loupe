// syntax highlighting via highlight.js (CDN, loaded as a side-effect module).
// the common bundle omits powershell, so register it explicitly.
import hljs from "https://esm.sh/highlight.js@11.10.0/lib/common";
import powershell from "https://esm.sh/highlight.js@11.10.0/lib/languages/powershell";
import { langFor } from "/util.js";

hljs.registerLanguage("powershell", powershell);

// returns highlighted inner html for one line of code, or escaped plain text.
export function highlightLine(content, path) {
  const lang = langFor(path);
  if (!content) return "";
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(content, { language: lang, ignoreIllegals: true }).value;
    }
    return hljs.highlightAuto(content).value;
  } catch {
    return escapeHtml(content);
  }
}

export function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
