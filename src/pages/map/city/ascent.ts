import type { CityDistrict, Pt } from '@/data/city';
import { distToPath, pointInPolygon, rng } from './geometry';

/**
 * Geometria de fundo de Ascent City: a cidade retangular cortada por um canal de
 * norte a sul, o mar a oeste e ao norte, e o interior verde a leste (lago, rio,
 * colinas da prisão e a rodovia para PYM-City).
 */

export const CITY = { x0: 520, y0: 90, x1: 1080, y1: 910 };
export const CANAL = { x0: 830, x1: 875, y0: 125, y1: 1045 };

export const LAND: Pt[] = [
  [505, 60], [1110, 60], [1180, 20], [1300, -300], [1900, -300], [1900, 1300], [920, 1300], [905, 1045],
  [640, 1010], [560, 975], [505, 930], [492, 820], [500, 650], [485, 450], [500, 250],
];

export const LAKE: Pt[] = [[1150, 540], [1230, 520], [1300, 560], [1320, 640], [1280, 710], [1190, 720], [1150, 660]];
export const RIVER = 'M1330 1150C1400 960 1480 900 1500 780S1560 620 1720 560';

/** Avenidas (y) e ruas (x) da malha. */
export const YS = [90, 190, 310, 440, 600, 760, 860, 910];
export const XS_WEST = [520, 612, 700, 790];
export const XS_EAST = [905, 992, 1080];
/** Avenidas que atravessam o canal por pontes */
export const BRIDGES = [190, 440, 860];

export const PARKS = {
  norte: { x: 524, y: 194, w: 172, h: 112 },
  praca: { x: 616, y: 444, w: 170, h: 152 },
  jardim: { x: 524, y: 444, w: 84, h: 152 },
};
export const PIER = { x: 790, y: 90, w: 115, h: 35 };

const inRect = ([x, y]: Pt, r: { x: number; y: number; w: number; h: number }) => x > r.x - 2 && x < r.x + r.w + 2 && y > r.y - 2 && y < r.y + r.h + 2;

export function ascentGrid(): string {
  const parts: string[] = [];
  for (const y of YS.slice(1, -1)) {
    parts.push(`M${CITY.x0} ${y}H${XS_WEST[XS_WEST.length - 1] + 6}`, `M${XS_EAST[0] - 6} ${y}H${CITY.x1}`);
  }
  for (const x of [...XS_WEST.slice(1), ...XS_EAST.slice(0, -1)]) parts.push(`M${x} ${CITY.y0}V${CITY.y1}`);
  // Avenidas da margem do canal
  parts.push(`M812 ${CANAL.y0}V${CITY.y1}`, `M893 ${CANAL.y0}V${CITY.y1}`);
  return parts.join('');
}

/** Quadras; a coluna oeste vira o Distrito das Torres (um prédio alto por quadra). */
export function ascentBlocks(districts: CityDistrict[]) {
  const rand = rng(2007);
  const tinted = districts.filter((d) => d.layer === 'cidade' && d.tone && d.tone !== 'neutro' && d.tone !== 'verde' && d.tone !== 'agua');
  const byTone = new Map<string, string[]>();
  const push = (tone: string, d: string) => {
    const list = byTone.get(tone) ?? [];
    list.push(d);
    byTone.set(tone, list);
  };
  const rect = (a: number, b: number, c: number, d: number) => `M${a.toFixed(1)} ${b.toFixed(1)}H${c.toFixed(1)}V${d.toFixed(1)}H${a.toFixed(1)}Z`;

  const cols: [number, number][] = [];
  for (let i = 0; i < XS_WEST.length - 1; i++) cols.push([XS_WEST[i], XS_WEST[i + 1]]);
  for (let i = 0; i < XS_EAST.length - 1; i++) cols.push([XS_EAST[i], XS_EAST[i + 1]]);

  for (const [cx0, cx1] of cols) {
    for (let j = 0; j < YS.length - 1; j++) {
      const x0 = cx0 + 5;
      const x1 = cx1 - 5;
      const y0 = YS[j] + 6;
      const y1 = YS[j + 1] - 6;
      if (y1 - y0 < 12) continue;
      const center: Pt = [(x0 + x1) / 2, (y0 + y1) / 2];
      if (Object.values(PARKS).some((p) => inRect(center, p))) continue;
      const tower = cx0 === XS_WEST[0];
      const tone = tower ? 'torre' : (tinted.find((t) => pointInPolygon(center, t.shape))?.tone ?? 'neutro');
      if (tower) {
        push(tone, rect(x0, y0, x1, y1));
        continue;
      }
      const lots: [number, number, number, number][] = [];
      const split = rand();
      if (split < 0.3) lots.push([x0, y0, x1, y1]);
      else if (split < 0.7) {
        const m = y0 + (y1 - y0) * (0.4 + rand() * 0.2);
        lots.push([x0, y0, x1, m - 1.5], [x0, m + 1.5, x1, y1]);
      } else {
        const m = x0 + (x1 - x0) * (0.4 + rand() * 0.2);
        lots.push([x0, y0, m - 1.5, y1], [m + 1.5, y0, x1, y1]);
      }
      for (const [a, b, c, d] of lots) push(tone, rect(a, b, c, d));
    }
  }
  return [...byTone.entries()].map(([tone, parts]) => ({ tone, d: parts.join('') }));
}

/** Árvores do interior, fora da cidade, do lago, das estradas e das áreas desenhadas. */
export function ascentTrees(avoid: Pt[][], roads: Pt[][]) {
  const rand = rng(78);
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 1600 && out.length < 230; i++) {
    const p: Pt = [1095 + rand() * 520, 40 + rand() * 960];
    if (!pointInPolygon(p, LAND) || pointInPolygon(p, LAKE)) continue;
    if (avoid.some((a) => pointInPolygon(p, a))) continue;
    if (roads.some((r) => distToPath(p, r) < 18)) continue;
    const r = 6 + rand() * 8;
    if (out.some((t) => Math.hypot(t.x - p[0], t.y - p[1]) < (t.r + r) * 0.9)) continue;
    out.push({ x: p[0], y: p[1], r });
  }
  // Faixa ao sul da cidade
  for (let i = 0; i < 400 && out.length < 290; i++) {
    const p: Pt = [520 + rand() * 560, 918 + rand() * 80];
    if (!pointInPolygon(p, LAND) || (p[0] > CANAL.x0 - 6 && p[0] < CANAL.x1 + 6)) continue;
    out.push({ x: p[0], y: p[1], r: 5 + rand() * 6 });
  }
  return out;
}
