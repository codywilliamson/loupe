// first-paint loading state: the loupe mark + an indeterminate bar so a slow initial
// diff reads as working rather than frozen.
import { html } from "/preact.js";
import { ApertureMark } from "/icons.js";

export function LoadingScreen() {
  return html`<div class="loading-screen">
    <div class="loading-mark" aria-label="Loupe is reading the diff"><${ApertureMark} size=${30} /></div>
    <div class="loading-bar"><span></span></div>
    <div class="loading-text">Reading the diff…</div>
  </div>`;
}
