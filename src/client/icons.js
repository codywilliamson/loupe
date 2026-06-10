// inline svg icons (lucide paths) — robust, no CDN wiring. each returns vnodes.
import { html } from "/preact.js";

const svg = (children, size = 16) => html`<svg
  class="icon"
  width=${size}
  height=${size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>${children}</svg>`;

export const ChevronRight = () => svg(html`<path d="m9 18 6-6-6-6" />`);
export const ChevronDown = () => svg(html`<path d="m6 9 6 6 6-6" />`);

export const Bubble = () =>
  svg(html`<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />`, 14);

export const Copy = () =>
  svg(html`<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path
    d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
  />`);

export const X = () =>
  svg(html`<path d="M18 6 6 18" /><path d="m6 6 12 12" />`);

export const MessageSquare = () =>
  svg(html`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />`, 14);

export const Sun = () =>
  svg(html`<circle cx="12" cy="12" r="4" /><path
    d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
  />`);

export const Moon = () =>
  svg(html`<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />`);

// four-point starburst — the claude theme variants
export const Spark = () =>
  svg(html`<path
    d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
  />`);

export const Refresh = () =>
  svg(html`<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path
    d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
  /><path d="M3 21v-5h5" />`);

export const HelpCircle = () =>
  svg(html`<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />`);

// side-by-side (two columns) — global split toggle
export const Columns = () =>
  svg(html`<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" />`);

// single document — single-file view toggle
export const File = () =>
  svg(html`<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v5h5" />`);
