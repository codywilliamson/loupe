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
