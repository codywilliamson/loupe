// Click framed images to inspect them; Escape and the close control restore focus.
(() => {
  const shots = [...document.querySelectorAll(".frame img")];
  if (!shots.length) return;
  let backdrop;
  let opener;
  const close = () => {
    if (!backdrop) return;
    const old = backdrop;
    backdrop = undefined;
    old.remove();
    opener?.focus();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (event) => { if (event.key === "Escape") close(); };
  const open = (image) => {
    opener = image;
    backdrop = document.createElement("div");
    backdrop.className = "lb-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", image.alt || "Loupe screenshot");
    const enlarged = document.createElement("img");
    enlarged.className = "lb-img";
    enlarged.src = image.currentSrc || image.src;
    enlarged.alt = image.alt;
    const closeButton = document.createElement("button");
    closeButton.className = "lb-close";
    closeButton.type = "button";
    closeButton.textContent = "close ×";
    closeButton.addEventListener("click", close);
    backdrop.append(enlarged, closeButton);
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) close(); });
    document.body.append(backdrop);
    document.addEventListener("keydown", onKey);
    closeButton.focus();
    requestAnimationFrame(() => backdrop?.classList.add("on"));
  };
  shots.forEach((image) => {
    image.classList.add("zoomable");
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", `Enlarge ${image.alt || "Loupe screenshot"}`);
    image.addEventListener("click", () => open(image));
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(image); }
    });
  });
})();
