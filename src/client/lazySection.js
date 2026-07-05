// mounts heavy file bodies only near the viewport. far-away sections render a
// height-preserving placeholder, so a big diff paints instantly and the
// scrollbar stays stable as sections mount/unmount.
import { html, useState, useRef, useEffect } from "/preact.js";

const NEAR_MARGIN = "1200px 0px"; // pre-mount roughly a screen ahead in each direction

export function LazyMount({ estimate, keepMounted, onVisible, children }) {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  const height = useRef(estimate);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // the diff list scrolls inside .diff-pane, not the viewport — that's the
    // clipping ancestor, so it must be the IO root for the lookahead margin to apply
    const root = el.closest(".diff-pane");
    const io = new IntersectionObserver(
      ([entry]) => {
        // record the real height on the way out so the placeholder matches
        if (!entry.isIntersecting && entry.boundingClientRect.height > 0) {
          height.current = entry.boundingClientRect.height;
        }
        setNear(entry.isIntersecting);
      },
      { root, rootMargin: NEAR_MARGIN }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const mounted = near || keepMounted;
  // let the parent react to the body mounting (re-measure pane widths etc.)
  useEffect(() => {
    if (onVisible) onVisible(mounted);
  }, [mounted]);
  return html`<div ref=${ref} class="lazy-body" style=${mounted ? "" : `height:${height.current}px`}>
    ${mounted ? children : null}
  </div>`;
}
