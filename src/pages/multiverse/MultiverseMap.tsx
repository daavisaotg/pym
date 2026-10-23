import { useEffect, useRef, useState } from 'react';
import type { Earth, EarthStatus } from '@/data/types';
import { prefersReducedMotion } from '@/lib/asset';
import { Icon } from '@/components/ui/Icon';
import { getTexture, renderPlanet, type PlanetTexture } from './planet';
import styles from './MultiverseMap.module.css';

interface Props {
  earths: Earth[];
  selectedId?: string;
  /** Terras em destaque (ex.: as de um evento aberto) */
  highlight?: string[];
  onSelect: (id: string | null) => void;
  /** Espaço ocupado pelo painel aberto, para a câmera centralizar no que sobra. */
  inset: { right: number; bottom: number };
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface Body {
  earth: Earth;
  /** posição original no mapa */
  ox: number;
  oy: number;
  /** posição usada no desenho (girada 90° em telas em pé) */
  x: number;
  y: number;
  r: number;
  tex?: PlanetTexture;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  size: number;
  image?: ImageData;
  phase: number;
}

const SIZES = [32, 48, 64, 96, 128, 160, 200, 256, 320, 400];
const pickSize = (px: number) => SIZES.find((s) => s >= px) ?? SIZES[SIZES.length - 1];

export const statusTone: Record<EarthStatus, string> = {
  estável: 'var(--bege-2)',
  ameaçada: 'var(--red-signal)',
  instável: 'var(--red-signal)',
  unificada: 'var(--white)',
  'em colapso': 'var(--red-signal)',
  destruída: 'var(--bege-3)',
  isolada: 'var(--bege-3)',
  desconhecido: 'var(--bege-3)',
};

/** Pontos da galáxia ao fundo: três braços espirais, sempre os mesmos. */
function makeGalaxy() {
  let s = 4242;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pts: { x: number; y: number; a: number; warm: boolean; r: number }[] = [];
  for (let i = 0; i < 1500; i++) {
    const arm = i % 3;
    const t = Math.pow(rand(), 0.7);
    const angle = t * 5.2 + (arm * Math.PI * 2) / 3;
    const radius = 40 + t * 1250;
    const spread = 30 + t * 150;
    pts.push({
      x: Math.cos(angle) * radius + (rand() - 0.5) * spread - 120,
      y: Math.sin(angle) * radius * 0.62 + (rand() - 0.5) * spread * 0.6 + 40,
      a: (1 - t) * 0.5 + 0.08,
      warm: rand() > 0.72,
      r: rand() > 0.97 ? 1.6 : 0.8,
    });
  }
  return pts;
}

export function MultiverseMap({ earths, selectedId, highlight, onSelect, inset }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const state = useRef({
    cam: { x: 0, y: 0, zoom: 0.8 } as Camera,
    target: { x: 0, y: 0, zoom: 0.8 } as Camera,
    follow: true,
    hovered: null as string | null,
    selected: selectedId,
    highlight: highlight ?? [],
    inset,
    width: 0,
    height: 0,
  });
  const [ready, setReady] = useState(false);

  // Mantém os valores das props acessíveis ao laço de animação.
  state.current.selected = selectedId;
  state.current.highlight = highlight ?? [];
  state.current.inset = inset;

  const bodiesRef = useRef<Body[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* Corpos: um por Terra, texturas geradas aos poucos para não travar a página. */
  useEffect(() => {
    const bodies: Body[] = earths.map((earth, i) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const pos = earth.visual?.position ?? [Math.cos(i * 2.4) * 420, Math.sin(i * 2.4) * 260];
      const portrait = state.current.width > 0 && state.current.width / state.current.height < 0.8;
      return {
        earth,
        ox: pos[0],
        oy: pos[1],
        x: portrait ? pos[1] * 1.1 : pos[0],
        y: portrait ? pos[0] * 0.9 : pos[1],
        r: earth.visual?.size ?? 50,
        canvas,
        ctx,
        size: 0,
        phase: i * 0.37,
      };
    });
    bodiesRef.current = bodies;

    let cancelled = false;
    let i = 0;
    const next = () => {
      if (cancelled || i >= bodies.length) {
        if (!cancelled) setReady(true);
        return;
      }
      const b = bodies[i++];
      b.tex = getTexture(b.earth.visual?.theme ?? 'arquivo', b.earth.visual?.seed ?? i * 13);
      setTimeout(next, 16);
    };
    const t = setTimeout(next, 30);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [earths]);

  /* Câmera: enquadra tudo, ou aproxima da Terra selecionada. */
  const fitAll = () => {
    const st = state.current;
    const bodies = bodiesRef.current;
    if (!bodies.length || !st.width) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const b of bodies) {
      minX = Math.min(minX, b.x - b.r * 2.2);
      maxX = Math.max(maxX, b.x + b.r * 2.2);
      minY = Math.min(minY, b.y - b.r * 2.2);
      maxY = Math.max(maxY, b.y + b.r * 2.6);
    }
    // reserva espaço para o título (em cima) e a legenda (embaixo) do HUD
    const narrow = st.width < 900;
    const top = st.inset.bottom ? 0 : narrow ? 200 : 60;
    const bottom = st.inset.bottom || (narrow ? 190 : 120);
    const w = st.width - st.inset.right;
    const h = st.height - top - bottom;
    const zoom = Math.min(1.25, Math.max(0.2, Math.min((w * 0.86) / (maxX - minX), (h * 0.9) / (maxY - minY))));
    st.target = {
      x: (minX + maxX) / 2 + st.inset.right / 2 / zoom,
      y: (minY + maxY) / 2 + (bottom - top) / 2 / zoom,
      zoom,
    };
    st.follow = true;
  };

  const focusOn = (id: string) => {
    const st = state.current;
    const b = bodiesRef.current.find((x) => x.earth.id === id);
    if (!b || !st.width) return;
    const w = st.width - st.inset.right;
    const h = st.height - st.inset.bottom;
    const screenR = Math.min(h * 0.27, w * 0.27, 230);
    const zoom = screenR / b.r;
    st.target = { x: b.x + st.inset.right / 2 / zoom, y: b.y + st.inset.bottom / 2 / zoom, zoom };
    st.follow = true;
  };

  useEffect(() => {
    if (!ready) return;
    if (selectedId) focusOn(selectedId);
    else fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready, inset.right, inset.bottom]);

  /* Laço de desenho */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !wrap || !ctx) return;

    const reduced = prefersReducedMotion();
    const galaxy = makeGalaxy();
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let last = performance.now();
    const st = state.current;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.width = rect.width;
      st.height = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // Em telas em pé, o mapa gira 90° para as Terras caberem na vertical.
      const portrait = st.width / st.height < 0.8;
      for (const b of bodiesRef.current) {
        b.x = portrait ? b.oy * 1.1 : b.ox;
        b.y = portrait ? b.ox * 0.9 : b.oy;
      }
      if (st.selected) focusOn(st.selected);
      else fitAll();
      if (reduced || !st.cam.zoom) st.cam = { ...st.target };
    };

    const toScreen = (x: number, y: number) => ({
      x: (x - st.cam.x) * st.cam.zoom + st.width / 2,
      y: (y - st.cam.y) * st.cam.zoom + st.height / 2,
    });

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const time = reduced ? 0 : now / 1000;

      // câmera suave
      const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
      st.cam.x += (st.target.x - st.cam.x) * k;
      st.cam.y += (st.target.y - st.cam.y) * k;
      st.cam.zoom += (st.target.zoom - st.cam.zoom) * k;

      const { width: W, height: H } = st;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* Galáxia (paralaxe: anda mais devagar que a câmera) */
      const gz = Math.pow(st.cam.zoom, 0.55) * 0.9;
      for (const p of galaxy) {
        const sx = (p.x - st.cam.x * 0.55) * gz + W / 2;
        const sy = (p.y - st.cam.y * 0.55) * gz + H / 2;
        if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
        ctx.fillStyle = p.warm ? `rgba(200, 52, 38, ${p.a * 0.7})` : `rgba(230, 216, 188, ${p.a * 0.55})`;
        ctx.fillRect(sx, sy, p.r, p.r);
      }

      /* Grade de carta estelar */
      const origin = toScreen(0, 0);
      ctx.strokeStyle = 'rgba(230, 216, 188, 0.05)';
      ctx.lineWidth = 1;
      for (let ring = 250; ring <= 1250; ring += 250) {
        ctx.beginPath();
        ctx.ellipse(origin.x, origin.y, ring * st.cam.zoom, ring * st.cam.zoom * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      for (let a = 0; a < 12; a++) {
        const ang = (a / 12) * Math.PI * 2;
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + Math.cos(ang) * 1300 * st.cam.zoom, origin.y + Math.sin(ang) * 1300 * st.cam.zoom * 0.62);
      }
      ctx.stroke();

      const bodies = bodiesRef.current;
      const byId = new Map(bodies.map((b) => [b.earth.id, b]));

      /* Conexões luminosas */
      const drawn = new Set<string>();
      for (const b of bodies) {
        for (const c of b.earth.connections ?? []) {
          const o = byId.get(c.to);
          if (!o) continue;
          const key = [b.earth.id, o.earth.id].sort().join('|');
          if (drawn.has(key)) continue;
          drawn.add(key);

          const a = toScreen(b.x, b.y);
          const z = toScreen(o.x, o.y);
          const mx = (a.x + z.x) / 2;
          const my = (a.y + z.y) / 2;
          const dx = z.x - a.x;
          const dy = z.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const cx = mx - (dy / len) * len * 0.16;
          const cy = my + (dx / len) * len * 0.16;
          const active =
            st.selected === b.earth.id || st.selected === o.earth.id || st.highlight.includes(b.earth.id);
          const unknown = b.earth.status === 'desconhecido' || o.earth.status === 'desconhecido';

          ctx.setLineDash(unknown ? [3, 7] : []);
          ctx.strokeStyle = `rgba(200, 38, 29, ${active ? 0.35 : 0.16})`;
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cx, cy, z.x, z.y);
          ctx.stroke();

          const grad = ctx.createLinearGradient(a.x, a.y, z.x, z.y);
          grad.addColorStop(0, `rgba(200, 38, 29, ${active ? 0.95 : 0.6})`);
          grad.addColorStop(1, `rgba(230, 216, 188, ${active ? 0.95 : 0.6})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.quadraticCurveTo(cx, cy, z.x, z.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // pulsos viajando pela ligação
          if (!unknown) {
            for (let p = 0; p < 3; p++) {
              const t = (time * 0.09 + p / 3) % 1;
              const it = 1 - t;
              const px = it * it * a.x + 2 * it * t * cx + t * t * z.x;
              const py = it * it * a.y + 2 * it * t * cy + t * t * z.y;
              const g = ctx.createRadialGradient(px, py, 0, px, py, 7);
              g.addColorStop(0, 'rgba(251, 248, 243, 0.9)');
              g.addColorStop(1, 'rgba(251, 248, 243, 0)');
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(px, py, 7, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // rótulo no meio da curva
          if (c.label && st.cam.zoom > 0.45) {
            const lx = 0.25 * a.x + 0.5 * cx + 0.25 * z.x;
            const ly = 0.25 * a.y + 0.5 * cy + 0.25 * z.y;
            ctx.font = '500 11px "IBM Plex Mono", ui-monospace, monospace';
            ctx.textAlign = 'center';
            const tw = ctx.measureText(c.label.toUpperCase()).width;
            ctx.fillStyle = 'rgba(7, 5, 4, 0.75)';
            ctx.fillRect(lx - tw / 2 - 6, ly - 10, tw + 12, 18);
            ctx.fillStyle = active ? 'rgba(251, 248, 243, 0.9)' : 'rgba(185, 169, 139, 0.75)';
            ctx.fillText(c.label.toUpperCase(), lx, ly + 3);
          }
        }
      }

      /* Planetas */
      for (const b of bodies) {
        const s = toScreen(b.x, b.y);
        const R = b.r * st.cam.zoom;
        const isSel = st.selected === b.earth.id;
        const isHi = isSel || st.hovered === b.earth.id || st.highlight.includes(b.earth.id);
        const dim = st.selected && !isSel && !st.highlight.includes(b.earth.id) ? 0.55 : 1;

        // botão de acessibilidade/clique acompanha o planeta
        const btn = buttonRefs.current.get(b.earth.id);
        if (btn) {
          btn.style.transform = `translate(${s.x - R}px, ${s.y - R}px)`;
          btn.style.width = `${R * 2}px`;
          btn.style.height = `${R * 2}px`;
        }

        if (s.x < -R * 3 || s.x > W + R * 3 || s.y < -R * 3 || s.y > H + R * 3) continue;

        // halo
        const atm = b.tex?.palette.atmosphere ?? [200, 180, 150];
        const halo = ctx.createRadialGradient(s.x, s.y, R * 0.9, s.x, s.y, R * (isHi ? 2.1 : 1.7));
        halo.addColorStop(0, `rgba(${atm[0]}, ${atm[1]}, ${atm[2]}, ${0.28 * dim})`);
        halo.addColorStop(1, `rgba(${atm[0]}, ${atm[1]}, ${atm[2]}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(s.x, s.y, R * 2.2, 0, Math.PI * 2);
        ctx.fill();

        if (b.tex) {
          const need = pickSize(R * 2 * dpr);
          if (b.size !== need) {
            b.size = need;
            b.canvas.width = b.canvas.height = need;
            b.image = b.ctx.createImageData(need, need);
          }
          // a Terra selecionada gira mais rápido, como no pedido do painel
          const speed = isSel ? 0.018 : 0.006;
          const rot = b.phase + time * speed;
          const noise = b.earth.status === 'desconhecido' ? 0.5 + 0.5 * Math.abs(Math.sin(time * 3)) : 0;
          renderPlanet(b.image!, b.tex, rot, rot * 1.35 + 0.2, noise);
          b.ctx.putImageData(b.image!, 0, 0);
          ctx.globalAlpha = dim;
          ctx.drawImage(b.canvas, s.x - R, s.y - R, R * 2, R * 2);
          ctx.globalAlpha = 1;
        } else {
          // enquanto a textura não fica pronta
          ctx.fillStyle = 'rgba(40, 30, 26, 1)';
          ctx.beginPath();
          ctx.arc(s.x, s.y, R, 0, Math.PI * 2);
          ctx.fill();
        }

        // anel de mira na Terra selecionada ou sob o ponteiro
        if (isHi) {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.strokeStyle = isSel ? 'rgba(230, 216, 188, 0.55)' : 'rgba(230, 216, 188, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 6]);
          ctx.lineDashOffset = -time * 8;
          ctx.beginPath();
          ctx.arc(0, 0, R * 1.32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          if (isSel) {
            ctx.rotate(time * 0.25);
            ctx.strokeStyle = 'rgba(200, 38, 29, 0.9)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, R * 1.32, -0.35, 0.35);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, R * 1.32, Math.PI - 0.35, Math.PI + 0.35);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(230, 216, 188, 0.5)';
            ctx.lineWidth = 1;
            for (let q = 0; q < 4; q++) {
              const ang = (q * Math.PI) / 2 + Math.PI / 4;
              ctx.beginPath();
              ctx.moveTo(Math.cos(ang) * R * 1.42, Math.sin(ang) * R * 1.42);
              ctx.lineTo(Math.cos(ang) * R * 1.56, Math.sin(ang) * R * 1.56);
              ctx.stroke();
            }
          }
          ctx.restore();
        }
      }
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) restart();
    });
    io.observe(wrap);
    const onVis = () => !document.hidden && visible && restart();
    document.addEventListener('visibilitychange', onVis);
    restart();

    /* Arrastar para mover (mouse e caneta; no toque a página continua rolando) */
    let drag: { x: number; y: number; cx: number; cy: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, cx: st.cam.x, cy: st.cam.y };
      canvas.setPointerCapture(e.pointerId);
      wrap.dataset.dragging = '';
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const nx = drag.cx - (e.clientX - drag.x) / st.cam.zoom;
      const ny = drag.cy - (e.clientY - drag.y) / st.cam.zoom;
      st.cam.x = st.target.x = nx;
      st.cam.y = st.target.y = ny;
      st.follow = false;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag) return;
      const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
      drag = null;
      delete wrap.dataset.dragging;
      // clique no vazio fecha a seleção
      if (moved < 4 && st.selected) onSelectRef.current(null);
    };
    /* Ctrl/⌘ + roda (ou pinça no trackpad) aproxima em direção ao cursor */
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - st.width / 2;
      const my = e.clientY - rect.top - st.height / 2;
      const factor = Math.exp(-e.deltaY * 0.0025);
      const zoom = Math.min(4, Math.max(0.25, st.target.zoom * factor));
      const wx = st.target.x + mx / st.target.zoom;
      const wy = st.target.y + my / st.target.zoom;
      st.target = { x: wx - mx / zoom, y: wy - my / zoom, zoom };
      st.follow = false;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('wheel', onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = (f: number) => {
    const st = state.current;
    st.target = { ...st.target, zoom: Math.min(4, Math.max(0.25, st.target.zoom * f)) };
    st.follow = false;
  };

  return (
    <div ref={wrapRef} className={styles.map} data-native-scroll>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <div className={styles.overlay}>
        {earths.map((e) => (
          <button
            key={e.id}
            type="button"
            ref={(el) => {
              if (el) buttonRefs.current.set(e.id, el);
              else buttonRefs.current.delete(e.id);
            }}
            className={styles.planet}
            aria-pressed={selectedId === e.id}
            aria-label={`${e.name}, ${e.code}, status ${e.status}`}
            onClick={() => onSelect(selectedId === e.id ? null : e.id)}
            onMouseEnter={() => (state.current.hovered = e.id)}
            onMouseLeave={() => (state.current.hovered = null)}
            onFocus={() => (state.current.hovered = e.id)}
            onBlur={() => (state.current.hovered = null)}
          >
            <span className={styles.label}>
              <span className={`${styles.labelCode} code`}>{e.code}</span>
              <span className={styles.labelName}>{e.name}</span>
              <span className={styles.labelStatus}>
                <span className={styles.dot} style={{ background: statusTone[e.status] }} />
                {e.status}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div
        className={styles.controls}
        style={{
          right: inset.right ? inset.right + 16 : undefined,
          bottom: inset.bottom ? inset.bottom + 16 : undefined,
        }}
      >
        <button type="button" onClick={() => zoomBy(1.3)} aria-label="Aproximar">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Afastar">
          −
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedId) onSelect(null);
            else fitAll();
          }}
          aria-label="Ver todas as Terras"
          title="Ver todas as Terras"
        >
          <Icon name="close" size={14} style={{ display: selectedId ? 'block' : 'none' }} />
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" style={{ display: selectedId ? 'none' : 'block' }}>
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
