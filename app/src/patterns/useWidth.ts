import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * An element's own width, measured as it changes. A page lays itself out by its own width, never the window's, so an
 * open form panel or an expanded navigation column beside it counts (3.4, 3.4.1).
 */
export function useWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}
