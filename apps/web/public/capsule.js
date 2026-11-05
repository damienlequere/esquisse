// A capsule on another site, where this script is put (see Capsules in the
// README): first a square in the page, then, from its icon, the whole page, over
// its menus and whatever contains the square, and back. An iframe cannot leave its
// rectangle by itself: this script makes it. The iframe stays where it is in the
// page, so it is not loaded again: its dialog, shown as modal, goes above the
// page without moving. All of it is in a closed shadow root, out of reach of the
// site's styles. The capsule draws its own corners, and the movement from one to the
// other (see Capsule.tsx): this only tells it where the square is, spreads it, and
// fades in the site's background color behind it, over the page, in as long.
(() => {
  const MESSAGE = "esquisse-capsule";

  const script = document.currentScript;
  const scene = script.dataset.scene ?? "";
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(scene)) {
    console.error(`Esquisse: data-scene="<game>/<scene>" expected, not « ${scene} »`);
    return;
  }
  const { origin } = new URL(script.src);
  const size = Number(script.dataset.size) || 350;

  // An element no site styles, its size out of reach of those that style them all.
  const host = document.createElement("esquisse-capsule");
  host.style.cssText = `display:inline-block!important;vertical-align:middle;width:${size}px!important;height:${size}px!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important`;
  const root = host.attachShadow({ mode: "closed" });
  // color-scheme: an iframe stays transparent around the square only if it is the
  // capsule's, whatever the site's.
  root.innerHTML = `<style>
    dialog {
      display: block;
      position: static;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: 0;
      overflow: hidden;
      background: none;
      transition: background-color 500ms cubic-bezier(0.45, 0, 0.55, 1);
    }
    @media (prefers-reduced-motion: reduce) {
      dialog {
        transition: none;
      }
    }
    dialog:modal {
      position: fixed;
      inset: 0;
      width: 100dvw;
      height: 100dvh;
    }
    dialog::backdrop {
      background: none;
    }
    .view {
      position: fixed;
      width: 100dvw;
      height: 100dvh;
      visibility: hidden;
      pointer-events: none;
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      color-scheme: light;
    }
  </style><dialog><iframe loading="lazy" sandbox="allow-scripts allow-same-origin"></iframe></dialog><div class="view"></div>`;

  const dialog = root.querySelector("dialog");
  const iframe = root.querySelector("iframe");
  iframe.title = script.dataset.title ?? scene;
  iframe.src = `${origin}/embed/${scene}`;

  const tell = (message) =>
    iframe.contentWindow?.postMessage({ type: MESSAGE, ...message }, origin);

  // The page does not scroll under the capsule.
  const page = document.documentElement;
  let overflow = "";

  // The site's background color: its body's, or its page's, or, with neither, the
  // browser's own.
  const clear = /^transparent$|,\s*0\)$|\/\s*0\)$/;
  const background = () =>
    [document.body, page]
      .map((element) => getComputedStyle(element).backgroundColor)
      .find((color) => !clear.test(color)) ?? "Canvas";

  // Where the square is, as it will be once the page scrolls again (its scrollbar
  // back): that is where the capsule goes back to.
  const square = () => {
    if (dialog.open) page.style.overflow = overflow;
    const { x, y, width, height } = host.getBoundingClientRect();
    if (dialog.open) page.style.overflow = "hidden";
    return { x, y, width, height };
  };

  window.addEventListener("message", ({ source, origin: from, data }) => {
    if (source !== iframe.contentWindow || from !== origin || data?.type !== MESSAGE) return;
    if (data.event === "ready") tell({ event: "hello" });
    if (data.event === "measure") {
      // It is about to go back: the background goes as it does.
      dialog.style.backgroundColor = "";
      const { width, height } = root.querySelector(".view").getBoundingClientRect();
      tell({ event: "rect", rect: square(), view: { width, height } });
    }
    if (data.event === "open" && !dialog.open) {
      overflow = page.style.overflow;
      page.style.overflow = "hidden";
      dialog.showModal();
      dialog.style.backgroundColor = background();
      iframe.focus();
    }
    if (data.event === "close" && dialog.open) dialog.close();
  });

  // Escape with the focus out of the iframe, a phone's back gesture: the capsule
  // goes back by itself, unless the browser insists.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    tell({ event: "reduce" });
  });
  dialog.addEventListener("close", () => {
    dialog.style.backgroundColor = "";
    page.style.overflow = overflow;
    tell({ event: "closed" });
  });

  script.before(host);
})();
