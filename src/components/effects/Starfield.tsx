import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/asset';
import styles from './Starfield.module.css';

interface Star {
  x: number;
  y: number;
  /** profundidade: 0.15 (longe) a 1 (perto) */
  z: number;
  r: number;
  phase: number;
  speed: number;
  warm: boolean;
}

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

/**
 * Campo de estrelas em canvas, fixo atrás do site.
 * Três profundidades com paralaxe suave no ponteiro e na rolagem,
 * cintilação lenta e poeira bege flutuando. Pausa quando a aba fica oculta
 * e vira um quadro estático com "reduzir movimento".
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let motes: Mote[] = [];
    let frame = 0;
    let last = performance.now();

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollY = window.scrollY;
    let smoothScroll = scrollY;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(Math.min(520, (width * height) / 3200));
      stars = Array.from({ length: count }, () => {
        const z = 0.15 + Math.random() ** 2 * 0.85;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          z,
          r: 0.35 + z * 1.15 * Math.random() + (Math.random() > 0.985 ? 0.9 : 0),
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.4,
          warm: Math.random() > 0.93,
        };
      });

      motes = Array.from({ length: width < 640 ? 8 : 16 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 6,
        vy: -2 - Math.random() * 5,
        a: 0.05 + Math.random() * 0.12,
      }));
    };

    const draw = (time: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);

      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      smoothScroll += (scrollY - smoothScroll) * 0.08;

      for (const s of stars) {
        // deriva lenta para a esquerda, mais rápida para estrelas próximas
        s.x -= s.z * 2.2 * dt;
        if (s.x < -4) s.x += width + 8;

        const px = s.x + pointer.x * s.z * 14;
        let py = s.y + pointer.y * s.z * 10 - smoothScroll * s.z * 0.12;
        py = ((py % height) + height) % height;

        const twinkle = 0.55 + 0.45 * Math.sin(time * 0.001 * s.speed + s.phase);
        const alpha = (0.18 + s.z * 0.7) * twinkle;
        ctx.fillStyle = s.warm ? `rgba(214, 72, 52, ${alpha})` : `rgba(240, 228, 206, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (s.r > 1.4) {
          // halo nas poucas estrelas grandes
          ctx.fillStyle = `rgba(240, 228, 206, ${alpha * 0.08})`;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const m of motes) {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3);
        g.addColorStop(0, `rgba(230, 216, 188, ${m.a})`);
        g.addColorStop(1, 'rgba(230, 216, 188, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      draw(now, dt);
      frame = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / width - 0.5) * 2;
      pointer.ty = (e.clientY / height - 0.5) * 2;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !reduced) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };
    let resizeTimer = 0;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        if (reduced) draw(0, 0);
      }, 120);
    };

    build();
    if (reduced) {
      draw(0, 0);
    } else {
      frame = requestAnimationFrame(loop);
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div className={styles.sky} aria-hidden="true">
      <div className={styles.nebula} />
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />
    </div>
  );
}
