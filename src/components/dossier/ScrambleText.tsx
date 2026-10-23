import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '@/lib/asset';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>';

/**
 * Texto que "decodifica" ao aparecer: as letras giram e assentam da esquerda
 * para a direita. Usado só no título da ficha, uma vez por abertura.
 */
export function ScrambleText({ text, duration = 700 }: { text: string; duration?: number }) {
  const [out, setOut] = useState(() => (prefersReducedMotion() ? text : ''));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setOut(text);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      let s = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (i < settled || ch === ' ') s += ch;
        else s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setOut(s);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration]);

  return (
    <>
      <span aria-hidden="true">{out}</span>
      <span className="visually-hidden">{text}</span>
    </>
  );
}
