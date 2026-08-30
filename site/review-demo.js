/* The homepage proof is a small, keyboard-operable review state machine. */
(() => {
  const panel = document.querySelector("#review-panel");
  const stage = document.querySelector(".review-stage");
  const status = document.querySelector("#stage-status");
  const tabs = [...document.querySelectorAll("[role=tab]")];
  if (!panel || !stage || !status || !tabs.length) return;

  const states = {
    inspect: { label: "inspect", title: "Find the line that changed.", copy: "Start with the live diff, not a pasted excerpt.", body: '<div class="code-proof"><span class="line-no">41</span><span class="line-sign">+</span><code>const port = Number(process.env.PORT) || 3000;</code></div><p class="stage-hint">The line stays in its file and surrounding context.</p>' },
    mark: { label: "mark", title: "Put the note on the line.", copy: "An anchor gives the agent a location and a reason.", body: '<div class="code-proof marked"><span class="line-no">41</span><span class="line-sign">+</span><code>const port = Number(process.env.PORT) || 3000;</code></div><div class="demo-comment"><span class="tag">issue</span><p>Validate the port before binding so a bad value fails clearly.</p><span class="comment-anchor">↳ line 41</span></div>' },
    return: { label: "return", title: "Return structured feedback.", copy: "Export the review with context the agent can act on.", body: '<div class="feedback"><span>review.md</span><code>### src/server/router.ts — line 41</code><p><b>[issue]</b> Validate the port before binding so a bad value fails clearly.</p><small>1 open comment · 1 file</small></div><p class="stage-hint">Copy it into Codex, Claude Code, or another coding agent.</p>' },
    resolve: { label: "rereview", title: "Rereview the response.", copy: "Refresh the live diff, then resolve what is actually fixed.", body: '<div class="code-proof resolved"><span class="line-no">41</span><span class="line-sign">+</span><code>const port = parsePort(process.env.PORT);</code><span class="resolved-mark">resolved</span></div><div class="demo-comment addressed"><span class="tag">addressed</span><p>Port parsing now rejects invalid values before the server starts.</p></div>' }
  };

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  function render(next) {
    const view = states[next];
    const update = () => {
      stage.dataset.state = next;
      panel.innerHTML = `<div class="stage-heading"><h2>${view.title}</h2><p>${view.copy}</p></div>${view.body}`;
      tabs.forEach((tab, index) => { const active = tab.dataset.state === next; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; tab.classList.toggle("active", active); if (active) { status.textContent = `${index + 1} of 4 · ${view.label}`; panel.setAttribute("aria-labelledby", tab.id); } });
    };
    if (!reduceMotion.matches && document.startViewTransition) document.startViewTransition(update); else update();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => render(tab.dataset.state));
    tab.addEventListener("keydown", (event) => { if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return; event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + tabs.length) % tabs.length; tabs[next].focus(); render(tabs[next].dataset.state); });
  });
  const copy = document.querySelector("[data-copy]");
  copy?.addEventListener("click", async () => { const target = document.getElementById(copy.dataset.copy); const note = document.querySelector(".copy-status"); if (!target || !note) return; try { await navigator.clipboard.writeText(target.textContent.trim()); note.textContent = "copied"; } catch { note.textContent = "select the commands to copy"; } setTimeout(() => { note.textContent = ""; }, 2200); });
})();
