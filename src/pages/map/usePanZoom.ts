import { useCallback, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/asset';

export interface Inset {
  right: number;
  bottom: number;
}

/** Margens fixas ocupadas pelo HUD (o quadro se encaixa no que sobra). */
export interface Pad {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface Cam {
  x: number;
  y: number;
  k: number;
}

interface Options {
  board: { w: number; h: number };
  inset: Inset;
  pad?: Pad;
  /** Em telas em pé, quanto da altura o quadro ocupa (o resto se explora arrastando). */
  portraitFill?: number;
  maxZoom?: number;
}

/**
 * Câmera de arrastar e aproximar para um SVG.
 * A transformação é aplicada direto no DOM (sem renderizar o React a cada quadro) e
 * exposta ao CSS em `--k` (escala) e `data-zoom` (far, mid, near) no <svg>.
 */
export function usePanZoom({ board, inset, pad = {}, portraitFill = 0.62, maxZoom = 7 }: Options) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const st = useRef({
    cur: { x: 0, y: 0, k: 1 } as Cam,
    target: { x: 0, y: 0, k: 1 } as Cam,
    fit: 1,
    follow: true,
    animating: false,
    frame: 0,
    w: 0,
    h: 0,
    inset,
    pad,
    dragged: false,
    ready: false,
  });
  st.current.inset = inset;
  st.current.pad = pad;

  /** Área livre para o quadro: [x0, y0, largura, altura]. */
  const area = useCallback((withPanel = true) => {
    const s = st.current;
    const l = s.pad.left ?? 0;
    const t = s.pad.top ?? 0;
    const r = Math.max(s.pad.right ?? 0, withPanel ? s.inset.right : 0);
    const b = Math.max(s.pad.bottom ?? 0, withPanel ? s.inset.bottom : 0);
    // Com painel aberto o HUD some no celular e fica translúcido no desktop: usa a tela toda
    const panelOpen = withPanel && (s.inset.right || s.inset.bottom);
    return panelOpen ? [0, 0, s.w - s.inset.right, s.h - s.inset.bottom] : [l, t, s.w - l - r, s.h - t - b];
  }, []);

  const apply = useCallback(() => {
    const s = st.current;
    const g = gRef.current;
    const svg = svgRef.current;
    if (!g || !svg) return;
    g.setAttribute('transform', `translate(${s.cur.x.toFixed(2)} ${s.cur.y.toFixed(2)}) scale(${s.cur.k.toFixed(4)})`);
    svg.style.setProperty('--k', s.cur.k.toFixed(4));
    const rel = s.cur.k / s.fit;
    const zoom = rel < 1.45 ? 'far' : rel < 2.6 ? 'mid' : 'near';
    if (svg.dataset.zoom !== zoom) svg.dataset.zoom = zoom;
  }, []);

  const clamp = useCallback(
    (c: Cam): Cam => {
      const s = st.current;
      const k = Math.min(s.fit * maxZoom, Math.max(s.fit * 0.75, c.k));
      const cw = board.w * k;
      const ch = board.h * k;
      const [ax, ay, aw, ah] = area();
      const x = Math.min(ax + aw * 0.75, Math.max(ax + aw * 0.25 - cw, c.x));
      const y = Math.min(ay + ah * 0.75, Math.max(ay + ah * 0.25 - ch, c.y));
      return { x, y, k };
    },
    [board.w, board.h, maxZoom, area],
  );

  const tick = useCallback(() => {
    const s = st.current;
    const t = s.target;
    const c = s.cur;
    const f = 0.18;
    c.x += (t.x - c.x) * f;
    c.y += (t.y - c.y) * f;
    c.k += (t.k - c.k) * f;
    if (Math.abs(t.x - c.x) < 0.3 && Math.abs(t.y - c.y) < 0.3 && Math.abs(t.k - c.k) < 0.0005) {
      s.cur = { ...t };
      s.animating = false;
      apply();
      return;
    }
    apply();
    s.frame = requestAnimationFrame(tick);
  }, [apply]);

  const go = useCallback(
    (next: Cam, instant = false) => {
      const s = st.current;
      s.target = clamp(next);
      if (instant || prefersReducedMotion()) {
        cancelAnimationFrame(s.frame);
        s.animating = false;
        s.cur = { ...s.target };
        apply();
        return;
      }
      if (!s.animating) {
        s.animating = true;
        s.frame = requestAnimationFrame(tick);
      }
    },
    [apply, clamp, tick],
  );

  /** Centraliza um ponto do quadro na área livre (descontando o painel). */
  const focus = useCallback(
    (pt: [number, number], zoomRel?: number, instant = false) => {
      const s = st.current;
      const k = zoomRel ? s.fit * zoomRel : s.target.k;
      const [ax, ay, aw, ah] = area();
      go({ x: ax + aw / 2 - pt[0] * k, y: ay + ah / 2 - pt[1] * k, k }, instant);
    },
    [go, area],
  );

  const measure = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const s = st.current;
    const r = svg.getBoundingClientRect();
    s.w = r.width;
    s.h = r.height;
    const [, , aw, ah] = area(false);
    const portrait = r.width / r.height < 0.8;
    s.fit = portrait ? (r.height * portraitFill) / board.h : Math.min((aw * 0.96) / board.w, (ah * 0.92) / board.h);
  }, [board.h, board.w, portraitFill, area]);

  const reset = useCallback(
    (instant = false) => {
      const s = st.current;
      s.follow = true;
      focus([board.w / 2, board.h / 2], 1, instant);
    },
    [board.h, board.w, focus],
  );

  const zoomAt = useCallback(
    (factor: number, sx?: number, sy?: number) => {
      const s = st.current;
      s.follow = false;
      const [ax, ay, aw, ah] = area();
      const px = sx ?? ax + aw / 2;
      const py = sy ?? ay + ah / 2;
      const t = s.target;
      const k = Math.min(s.fit * maxZoom, Math.max(s.fit * 0.75, t.k * factor));
      const bx = (px - t.x) / t.k;
      const by = (py - t.y) / t.k;
      go({ x: px - bx * k, y: py - by * k, k });
    },
    [go, maxZoom, area],
  );

  /* Medida inicial e redimensionamento */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    measure();
    reset(true);
    st.current.ready = true;
    const ro = new ResizeObserver(() => {
      const prevFit = st.current.fit;
      measure();
      if (st.current.follow) reset(true);
      else go({ ...st.current.target, k: (st.current.target.k / prevFit) * st.current.fit }, true);
    });
    ro.observe(svg);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(st.current.frame);
    };
  }, [measure, reset, go]);

  /* Arrastar, pinçar e roda do mouse */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; cam: Cam } | null = null;
    let pinch: { d: number; mx: number; my: number; cam: Cam } | null = null;

    const local = (e: PointerEvent | WheelEvent | MouseEvent) => {
      const r = svg.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointers.set(e.pointerId, local(e));
      st.current.dragged = false;
      if (pointers.size === 1) {
        start = { ...local(e), cam: { ...st.current.target } };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cam: { ...st.current.target } };
        start = null;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      const s = st.current;
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const k = pinch.cam.k * (d / pinch.d);
        const bx = (pinch.mx - pinch.cam.x) / pinch.cam.k;
        const by = (pinch.my - pinch.cam.y) / pinch.cam.k;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        s.dragged = true;
        s.follow = false;
        go({ x: mx - bx * k, y: my - by * k, k }, true);
        return;
      }
      if (!start) return;
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!s.dragged && Math.hypot(dx, dy) < 5) return;
      if (!s.dragged) {
        s.dragged = true;
        s.follow = false;
        svg.setPointerCapture(e.pointerId);
        svg.dataset.dragging = '';
      }
      go({ x: start.cam.x + dx, y: start.cam.y + dy, k: start.cam.k }, true);
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        start = { ...p, cam: { ...st.current.target } };
      }
      if (pointers.size === 0) {
        start = null;
        delete svg.dataset.dragging;
        // O clique que vem logo depois de um arrasto é ignorado (wasDrag)
        setTimeout(() => (st.current.dragged = false), 0);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const p = local(e);
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022)), p.x, p.y);
    };

    const onDbl = (e: MouseEvent) => {
      const p = local(e);
      zoomAt(1.8, p.x, p.y);
    };

    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false });
    svg.addEventListener('dblclick', onDbl);
    return () => {
      svg.removeEventListener('pointerdown', onDown);
      svg.removeEventListener('pointermove', onMove);
      svg.removeEventListener('pointerup', onUp);
      svg.removeEventListener('pointercancel', onUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('dblclick', onDbl);
    };
  }, [go, zoomAt]);

  /** Verdadeiro logo depois de um arrasto: use para ignorar o clique que o encerra. */
  const wasDrag = useCallback(() => st.current.dragged, []);
  const isFollowing = useCallback(() => st.current.follow, []);

  return { svgRef, gRef, focus, reset, zoomAt, wasDrag, isFollowing, measure };
}
