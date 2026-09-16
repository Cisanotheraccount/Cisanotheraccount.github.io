import { useEffect } from "react";
import Lenis from "lenis";

/** Desktop wheel inertia; touch, keyboard, dialogs and reduced motion stay native. */
export function useSmoothScroll(disabled: boolean, overlayOpen: boolean): void {
  useEffect(() => {
    const html = document.documentElement;
    const previousScrollBehavior = html.style.scrollBehavior;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposeInstance: (() => void) | undefined;

    // Native keyboard/focus scrolling must not inherit a second CSS easing curve.
    html.style.scrollBehavior = "auto";

    const synchronize = () => {
      disposeInstance?.();
      disposeInstance = undefined;
      if (disabled || overlayOpen || document.hidden || !finePointer.matches || reducedMotion.matches) return;

      const lenis = new Lenis({
        autoRaf: false,
        smoothWheel: true,
        syncTouch: false,
        lerp: 0.16,
        wheelMultiplier: 1,
        anchors: false,
        respectReducedMotion: true,
        prevent: (node) => node.matches("dialog, textarea, select, [contenteditable='true'], [data-native-scroll]"),
        virtualScroll: ({ event }) => !(event.ctrlKey || event.metaKey || event.shiftKey),
      });
      let frame: number | null = null;
      let disposed = false;
      const temporaryFocusTargets = new Map<HTMLElement, () => void>();

      const cancelFrame = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      };
      const tick = (time: number) => {
        frame = null;
        if (disposed || document.hidden) return;
        lenis.raf(time);
        if (lenis.isScrolling === "smooth") frame = requestAnimationFrame(tick);
      };
      const wake = () => {
        if (disposed || document.hidden || frame !== null) return;
        // A demand loop can sleep for minutes. Start its clock at this input,
        // otherwise Lenis interprets the idle time as one enormous first frame.
        lenis.time = performance.now();
        frame = requestAnimationFrame(tick);
      };
      const stopInertia = () => {
        cancelFrame();
        if (lenis.isScrolling === "smooth") {
          // Public API resets to the actual native position without a scrollTo.
          lenis.stop();
          lenis.start();
        }
      };
      const unsubscribeVirtual = lenis.on("virtual-scroll", ({ event, deltaY }) => {
        if (event.type === "wheel" && deltaY !== 0) wake();
        else if (event.type.startsWith("touch")) cancelFrame();
      });

      const focusTarget = (target: HTMLElement) => {
        if (!target.hasAttribute("tabindex") && target.tabIndex < 0) {
          target.setAttribute("tabindex", "-1");
          const restore = () => {
            target.removeEventListener("blur", restore);
            if (target.getAttribute("tabindex") === "-1") target.removeAttribute("tabindex");
            temporaryFocusTargets.delete(target);
          };
          temporaryFocusTargets.set(target, restore);
          target.addEventListener("blur", restore, { once: true });
        }
        target.focus({ preventScroll: true });
      };
      const onAnchorClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
        if (!link || !link.getAttribute("href") || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
        const url = new URL(link.href, window.location.href);
        const current = new URL(window.location.href);
        if (url.origin !== current.origin || url.pathname !== current.pathname || url.search !== current.search || !url.hash) return;
        let id: string;
        try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
        const target = document.getElementById(id) ?? (id === "top" ? html : null);
        if (!(target instanceof HTMLElement)) return;

        event.preventDefault();
        stopInertia();
        if (url.hash !== current.hash) window.history.pushState(window.history.state, "", url.hash);
        focusTarget(target);
        const immediate = id === "main" || link.classList.contains("skip-link");
        lenis.scrollTo(target, {
          immediate,
          duration: 0.85,
          easing: (t) => 1 - Math.pow(1 - t, 4),
        });
        if (!immediate && lenis.isScrolling === "smooth") wake();
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (["Tab", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) stopInertia();
      };

      document.addEventListener("click", onAnchorClick);
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("pointerdown", stopInertia, true);
      window.addEventListener("popstate", stopInertia);
      window.addEventListener("hashchange", stopInertia);

      disposeInstance = () => {
        disposed = true;
        cancelFrame();
        unsubscribeVirtual();
        document.removeEventListener("click", onAnchorClick);
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("pointerdown", stopInertia, true);
        window.removeEventListener("popstate", stopInertia);
        window.removeEventListener("hashchange", stopInertia);
        temporaryFocusTargets.forEach((restore) => restore());
        lenis.stop();
        lenis.destroy();
      };
    };

    synchronize();
    finePointer.addEventListener("change", synchronize);
    reducedMotion.addEventListener("change", synchronize);
    document.addEventListener("visibilitychange", synchronize);
    return () => {
      disposeInstance?.();
      finePointer.removeEventListener("change", synchronize);
      reducedMotion.removeEventListener("change", synchronize);
      document.removeEventListener("visibilitychange", synchronize);
      html.style.scrollBehavior = previousScrollBehavior;
    };
  }, [disabled, overlayOpen]);
}
