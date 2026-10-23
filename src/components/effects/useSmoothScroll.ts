import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/asset';

/**
 * Rolagem com inércia para mouse/trackpad no desktop.
 * Em toque, teclado, barra de rolagem ou "reduzir movimento", o navegador
 * continua no comando — só a roda do mouse é suavizada.
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    let target = window.scrollY;
    let current = window.scrollY;
    let animating = false;
    let frame = 0;
    let last = 0;

    const max = () => document.documentElement.scrollHeight - window.innerHeight;

    const canScrollInside = (el: Element | null, deltaY: number): boolean => {
      while (el && el !== document.body && el !== document.documentElement) {
        if (el instanceof HTMLElement) {
          if (el.dataset.nativeScroll !== undefined) return true;
          const style = getComputedStyle(el);
          const scrollable = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
          if (scrollable) {
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
          }
        }
        el = el.parentElement;
      }
      return false;
    };

    const step = (now: number) => {
      const dt = last ? Math.min((now - last) / 16.667, 3) : 1;
      last = now;
      const k = 1 - Math.pow(1 - 0.11, dt);
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        animating = false;
      }
      window.scrollTo(0, current);
      if (animating) frame = requestAnimationFrame(step);
      else last = 0;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented) return;
      if (document.documentElement.dataset.scrollLock !== undefined) return;
      if (canScrollInside(e.target as Element, e.deltaY)) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      e.preventDefault();
      const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
      if (!animating) current = target = window.scrollY;
      target = Math.max(0, Math.min(max(), target + e.deltaY * unit));
      if (!animating) {
        animating = true;
        frame = requestAnimationFrame(step);
      }
    };

    // Rolagem vinda de outro lugar (teclado, âncora, barra) reposiciona o alvo.
    const onScroll = () => {
      if (!animating) current = target = window.scrollY;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled]);
}
