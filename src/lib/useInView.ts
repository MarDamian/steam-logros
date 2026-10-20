import { useEffect, useRef, useState } from 'react';

/**
 * Avisa cuando el elemento entra en pantalla (una sola vez).
 * Es lo que dispara la carga perezosa del progreso de cada tarjeta.
 */
export function useInView<T extends Element>(rootMargin = '300px'): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  // Sin IntersectionObserver (jsdom, navegadores viejos) damos todo por visible.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
