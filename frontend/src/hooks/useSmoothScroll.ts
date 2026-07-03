import { useEffect } from 'react';
import Lenis from 'lenis';

// A light, subtle smooth scroll. Lenis drives the real window scroll (it does not
// transform the page), so position: sticky, the sticky filter rail, and the mobile
// sheet all keep working. Touch scrolling is left native, and we bail out entirely
// when the user prefers reduced motion. Inner scrollers opt out with
// data-lenis-prevent.
export function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });

    let frame = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);
}
