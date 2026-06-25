// click any framed screenshot/gif to view it full-size. vanilla, no deps.
(() => {
  const shots = document.querySelectorAll(".frame img");
  if (!shots.length) return;

  let backdrop = null;
  const close = () => {
    if (!backdrop) return;
    backdrop.classList.remove("on");
    const el = backdrop;
    backdrop = null;
    document.removeEventListener("keydown", onKey);
    setTimeout(() => el.remove(), 180);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  const open = (src, alt) => {
    backdrop = document.createElement("div");
    backdrop.className = "lb-backdrop";
    const img = document.createElement("img");
    img.className = "lb-img";
    img.src = src;
    img.alt = alt || "";
    backdrop.append(img, Object.assign(document.createElement("div"), { className: "lb-hint", textContent: "click anywhere or press Esc to close" }));
    backdrop.addEventListener("click", close);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add("on"));
    document.addEventListener("keydown", onKey);
  };

  shots.forEach((img) => {
    img.classList.add("zoomable");
    img.addEventListener("click", () => open(img.currentSrc || img.src, img.alt));
  });
})();
