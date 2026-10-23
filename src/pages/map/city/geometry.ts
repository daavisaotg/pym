import type { CityDistrict, CityStreet, Pt } from '@/data/city';

/**
 * Geometria decorativa de PYM-City: litoral, malha de ruas, quadras e o cenário dos Campos.
 * Os registros editáveis (bairros, ruas com nome, locais) ficam em `src/content/city.json`;
 * aqui fica só o desenho de fundo, sempre igual.
 */

export const BOARD = { w: 1600, h: 1000 };

/** Litoral da ilha principal, no sentido horário a partir da ponta oeste. */
export const ISLAND: Pt[] = [
  [112, 520], [150, 430], [210, 330], [300, 262], [430, 230], [600, 218], [800, 210], [1000, 206],
  [1200, 200], [1330, 196], [1420, 214], [1468, 260], [1478, 360], [1478, 560], [1470, 700],
  [1452, 780], [1380, 808], [1200, 812], [1000, 808], [800, 800], [600, 792], [420, 778],
  [300, 742], [210, 680], [150, 600],
];

/** Margens do continente, ao norte e ao sul do rio. */
export const SHORE_NORTH: Pt[] = [[-400, -400], [2000, -400], [2000, 92], [1600, 104], [1300, 86], [1000, 100], [700, 84], [400, 104], [120, 90], [-400, 110]];
export const SHORE_SOUTH: Pt[] = [[-400, 930], [200, 912], [500, 930], [820, 912], [1150, 928], [1450, 908], [2000, 926], [2000, 1400], [-400, 1400]];

/** Avenidas (horizontais) e ruas (verticais) da malha. */
export const AVENUES = [290, 360, 430, 500, 570, 640, 710];
export const STREETS = Array.from({ length: 26 }, (_, i) => 190 + i * 50);

/** Retângulo do Parque Central (sem quadras). */
export const PARK = { x: 720, y: 365, w: 280, h: 200 };

export const toPath = (pts: Pt[], close = false) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('') + (close ? 'Z' : '');

export function pointInPolygon([x, y]: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToPath(p: Pt, path: Pt[]) {
  let d = Infinity;
  for (let i = 1; i < path.length; i++) d = Math.min(d, distToSegment(p, path[i - 1], path[i]));
  return d;
}

export function centroid(poly: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of poly) {
    x += p[0];
    y += p[1];
  }
  return [x / poly.length, y / poly.length];
}

/** Ponto no meio do comprimento de uma linha. */
export function midpoint(path: Pt[]): Pt {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  let half = total / 2;
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (half <= seg) {
      const t = half / seg;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * t, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * t];
    }
    half -= seg;
  }
  return path[0];
}

export function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/**
 * Quadras: cada célula da malha vira de um a três lotes. As quadras ganham o tom do bairro
 * em que caem e somem sob o parque e sob ruas diagonais.
 */
export function buildBlocks(districts: CityDistrict[], streets: CityStreet[]) {
  const rand = rng(1610);
  const diagonals = streets.filter((s) => s.layer === 'cidade' && s.path.length >= 2 && s.path.some((p, i) => i > 0 && p[0] !== s.path[0][0] && p[1] !== s.path[0][1]));
  const tinted = districts.filter((d) => d.layer === 'cidade' && d.tone && d.tone !== 'neutro' && d.tone !== 'verde');
  const xs = [110, ...STREETS, 1490];
  const ys = [195, ...AVENUES, 815];
  const byTone = new Map<string, string[]>();

  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i] + 4.5;
      const x1 = xs[i + 1] - 4.5;
      const y0 = ys[j] + 6;
      const y1 = ys[j + 1] - 6;
      const lots: [number, number, number, number][] = [];
      const split = rand();
      if (split < 0.35) lots.push([x0, y0, x1, y1]);
      else if (split < 0.75) {
        const m = y0 + (y1 - y0) * (0.4 + rand() * 0.2);
        lots.push([x0, y0, x1, m - 1.5], [x0, m + 1.5, x1, y1]);
      } else {
        const m = x0 + (x1 - x0) * (0.35 + rand() * 0.3);
        const n = y0 + (y1 - y0) * (0.45 + rand() * 0.1);
        lots.push([x0, y0, m - 1.5, y1], [m + 1.5, y0, x1, n - 1.5], [m + 1.5, n + 1.5, x1, y1]);
      }
      for (const [a, b, c, d] of lots) {
        const center: Pt = [(a + c) / 2, (b + d) / 2];
        const corners: Pt[] = [[a, b], [c, b], [a, d], [c, d]];
        if (corners.filter((p) => pointInPolygon(p, ISLAND)).length < 3) continue;
        if (center[0] > PARK.x - 2 && center[0] < PARK.x + PARK.w + 2 && center[1] > PARK.y - 2 && center[1] < PARK.y + PARK.h + 2) continue;
        if (diagonals.some((s) => distToPath(center, s.path) < 9 + Math.max(c - a, d - b) / 3)) continue;
        const tone = tinted.find((t) => pointInPolygon(center, t.shape))?.tone ?? 'neutro';
        const list = byTone.get(tone) ?? [];
        list.push(`M${a.toFixed(1)} ${b.toFixed(1)}H${c.toFixed(1)}V${d.toFixed(1)}H${a.toFixed(1)}Z`);
        byTone.set(tone, list);
      }
    }
  }
  return [...byTone.entries()].map(([tone, parts]) => ({ tone, d: parts.join('') }));
}

/** Malha secundária: avenidas e ruas sem nome (o recorte pela ilha é feito no SVG). */
export function gridPath() {
  return [...AVENUES.map((y) => `M100 ${y}H1500`), ...STREETS.map((x) => `M${x} 180V830`)].join('');
}

/** Galerias de esgoto da Inferioridade: uma malha torta, deslocada da de cima. */
export function sewerPath() {
  const rand = rng(77);
  const parts: string[] = [];
  for (let y = 325; y < 800; y += 70) {
    let x = 140 + rand() * 40;
    let d = `M${x.toFixed(0)} ${y}`;
    while (x < 1450) {
      x += 60 + rand() * 80;
      d += `L${x.toFixed(0)} ${(y + (rand() - 0.5) * 22).toFixed(0)}`;
    }
    parts.push(d);
  }
  for (let x = 215; x < 1460; x += 100) {
    const y0 = 230 + rand() * 60;
    const y1 = 740 + rand() * 40;
    parts.push(`M${x + (rand() - 0.5) * 20} ${y0.toFixed(0)}L${(x + (rand() - 0.5) * 30).toFixed(0)} ${y1.toFixed(0)}`);
  }
  return parts.join('');
}

/* ── Campos ─────────────────────────────────────────────────── */

export const CAMPOS = {
  sea: [[840, 1000], [960, 880], [1060, 818], [1140, 806], [1200, 798], [1320, 806], [1440, 770], [1520, 720], [1600, 690], [1600, 1000]] as Pt[],
  cliffs: [
    [[880, 760], [990, 740], [1030, 800], [990, 860], [950, 900], [880, 900]],
    [[1400, 690], [1520, 640], [1600, 630], [1600, 690], [1520, 720], [1450, 772], [1430, 735]],
  ] as Pt[][],
  /** Morro onde fica a boca do túnel. */
  hill: [[-100, 300], [60, 330], [170, 420], [200, 520], [170, 640], [60, 720], [-100, 760]] as Pt[],
  forest: [[380, 110], [1060, 90], [1080, 300], [980, 400], [820, 440], [560, 430], [420, 380]] as Pt[],
};

/** Árvores do bosque dos Campos (sem cobrir o cemitério nem a estrada). */
export function buildTrees(clear: Pt[][], roads: Pt[][]) {
  const rand = rng(31);
  const trees: { x: number; y: number; r: number }[] = [];
  const b = bounds(CAMPOS.forest);
  for (let i = 0; i < 900 && trees.length < 260; i++) {
    const p: Pt = [b.x0 + rand() * (b.x1 - b.x0), b.y0 + rand() * (b.y1 - b.y0)];
    if (!pointInPolygon(p, CAMPOS.forest)) continue;
    if (clear.some((c) => pointInPolygon(p, c))) continue;
    if (roads.some((r) => distToPath(p, r) < 16)) continue;
    const r = 7 + rand() * 9;
    if (trees.some((t) => Math.hypot(t.x - p[0], t.y - p[1]) < (t.r + r) * 0.8)) continue;
    trees.push({ x: p[0], y: p[1], r });
  }
  // Árvores soltas pelo resto do interior
  for (let i = 0; i < 400 && trees.length < 330; i++) {
    const p: Pt = [220 + rand() * 1300, 120 + rand() * 640];
    if (pointInPolygon(p, CAMPOS.forest) || pointInPolygon(p, CAMPOS.sea)) continue;
    if (clear.some((c) => pointInPolygon(p, c)) || roads.some((r) => distToPath(p, r) < 22)) continue;
    if (rand() > 0.35) continue;
    trees.push({ x: p[0], y: p[1], r: 6 + rand() * 6 });
  }
  return trees;
}

/** Lápides: fileiras dentro do cemitério. */
export function buildGraves(shape: Pt[]) {
  const b = bounds(shape);
  const out: Pt[] = [];
  for (let y = b.y0 + 22; y < b.y1 - 12; y += 18) {
    for (let x = b.x0 + 22; x < b.x1 - 14; x += 16) {
      const p: Pt = [x + ((y / 18) % 2) * 6, y];
      if (pointInPolygon(p, shape)) out.push(p);
    }
  }
  return out;
}
