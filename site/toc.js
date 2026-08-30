// Keep the current documentation section registered in the sticky file index.
(() => {
  const toc = document.querySelector(".toc");
  const links = new Map([...document.querySelectorAll(".toc a")].map((link) => [link.hash.slice(1), link]));
  const sections = [...document.querySelectorAll(".prose h2[id]")];
  let current = "";
  const update = () => {
    let id = sections[0]?.id;
    sections.forEach((section) => { if (section.getBoundingClientRect().top <= 120) id = section.id; });
    if (!id || id === current) return;
    current = id;
    links.forEach((link) => link.classList.toggle("active", link === links.get(id)));
    const active = links.get(id);
    if (active && toc?.scrollWidth > toc.clientWidth) active.scrollIntoView({ block: "nearest", inline: "center" });
  };
  addEventListener("scroll", update, { passive: true });
  update();
})();
