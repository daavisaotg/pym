/**
 * Planetas do mapa do Multiverso, desenhados sem bibliotecas.
 *
 * Cada planeta tem uma textura procedural (ruído 3D amostrado na esfera, então
 * não há costura) e é projetado pixel a pixel numa esfera com inclinação axial,
 * luz, terminador, luzes de cidade no lado noturno, nuvens e brilho de atmosfera.
 * A geometria da esfera é pré-calculada por tamanho; por quadro só muda a rotação.
 */

import type { PlanetTheme } from '@/data/types';

const TEX_W = 512;
const TEX_H = 256;

type RGB = [number, number, number];

interface Palette {
  deep: RGB;
  shallow: RGB;
  low: RGB;
  high: RGB;
  peak: RGB;
  lights: RGB;
  cloud: RGB;
  atmosphere: RGB;
  /** limiar do mar (0–1) */
  sea: number;
  clouds: number;
  cityLights: number;
}

export const palettes: Record<PlanetTheme, Palette> = {
  // Terra-001: continentes de pergaminho sobre mares cor de vinho
  arquivo: {
    deep: [22, 6, 6],
    shallow: [64, 14, 12],
    low: [168, 146, 110],
    high: [214, 196, 160],
    peak: [246, 238, 222],
    lights: [255, 120, 70],
    cloud: [240, 232, 216],
    atmosphere: [214, 84, 60],
    sea: 0.52,
    clouds: 0.55,
    cityLights: 1,
  },
  // Terra-1610: o negativo da Terra-001, continentes vermelhos e mares de sépia
  ultimate: {
    deep: [26, 20, 16],
    shallow: [58, 46, 36],
    low: [120, 10, 8],
    high: [176, 30, 22],
    peak: [228, 150, 120],
    lights: [255, 210, 160],
    cloud: [230, 216, 188],
    atmosphere: [230, 216, 188],
    sea: 0.5,
    clouds: 0.4,
    cityLights: 0.8,
  },
  // Realidade sem registro: escura, quase sem relevo, só estática
  desconhecido: {
    deep: [10, 9, 9],
    shallow: [20, 18, 17],
    low: [34, 31, 29],
    high: [52, 48, 44],
    peak: [80, 74, 68],
    lights: [200, 38, 29],
    cloud: [90, 84, 78],
    atmosphere: [127, 114, 94],
    sea: 0.45,
    clouds: 0.25,
    cityLights: 0.15,
  },
  brasa: {
    deep: [30, 6, 2],
    shallow: [90, 20, 6],
    low: [190, 70, 20],
    high: [240, 150, 60],
    peak: [255, 230, 180],
    lights: [255, 240, 200],
    cloud: [80, 40, 30],
    atmosphere: [255, 110, 40],
    sea: 0.5,
    clouds: 0.3,
    cityLights: 0.5,
  },
  gelo: {
    deep: [14, 20, 28],
    shallow: [40, 56, 70],
    low: [170, 180, 186],
    high: [214, 222, 226],
    peak: [250, 252, 252],
    lights: [255, 220, 160],
    cloud: [240, 244, 246],
    atmosphere: [190, 210, 230],
    sea: 0.5,
    clouds: 0.5,
    cityLights: 0.6,
  },
  vazio: {
    deep: [4, 3, 3],
    shallow: [8, 6, 6],
    low: [16, 12, 12],
    high: [28, 22, 22],
    peak: [40, 32, 32],
    lights: [200, 38, 29],
    cloud: [30, 26, 26],
    atmosphere: [80, 20, 18],
    sea: 0.5,
    clouds: 0.1,
    cityLights: 0.3,
  },
};

/* ── Ruído ──────────────────────────────────────────────────── */

function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number, x: number, y: number, z: number) => {
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  return (x: number, y: number, z: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
        lerp(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v),
      w,
    );
  };
}

/* ── Textura ────────────────────────────────────────────────── */

export interface PlanetTexture {
  /** cor da superfície (RGB) */
  surface: Uint8ClampedArray;
  /** intensidade das luzes de cidade (0–255) */
  lights: Uint8ClampedArray;
  /** cobertura de nuvens (0–255) */
  clouds: Uint8ClampedArray;
  palette: Palette;
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const textureCache = new Map<string, PlanetTexture>();

export function getTexture(theme: PlanetTheme, seed: number): PlanetTexture {
  const key = `${theme}:${seed}`;
  const hit = textureCache.get(key);
  if (hit) return hit;

  const pal = palettes[theme];
  const n1 = makeNoise(seed);
  const n2 = makeNoise(seed + 101);
  const n3 = makeNoise(seed + 202);
  const surface = new Uint8ClampedArray(TEX_W * TEX_H * 3);
  const lights = new Uint8ClampedArray(TEX_W * TEX_H);
  const clouds = new Uint8ClampedArray(TEX_W * TEX_H);

  for (let j = 0; j < TEX_H; j++) {
    const lat = (j / TEX_H - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    const y = Math.sin(lat);
    for (let i = 0; i < TEX_W; i++) {
      const lon = (i / TEX_W) * Math.PI * 2;
      const x = cl * Math.cos(lon);
      const z = cl * Math.sin(lon);

      // relevo: fbm de 5 oitavas
      let h = 0;
      let amp = 0.5;
      let f = 1.6;
      for (let o = 0; o < 5; o++) {
        h += amp * n1(x * f + 11, y * f + 7, z * f + 3);
        amp *= 0.5;
        f *= 2.1;
      }
      h = clamp01(h * 0.9 + 0.5);

      // gelo nos polos
      const polar = clamp01((Math.abs(y) - 0.86) * 8);

      let c: RGB;
      if (h < pal.sea) c = mix(pal.deep, pal.shallow, Math.pow(h / pal.sea, 2.2));
      else {
        const t = (h - pal.sea) / (1 - pal.sea);
        c = t < 0.55 ? mix(pal.low, pal.high, t / 0.55) : mix(pal.high, pal.peak, (t - 0.55) / 0.45);
      }
      if (polar > 0) c = mix(c, pal.peak, polar * 0.85);

      const k = (j * TEX_W + i) * 3;
      surface[k] = c[0];
      surface[k + 1] = c[1];
      surface[k + 2] = c[2];

      // cidades: aglomerados em terra firme, longe dos polos
      if (h > pal.sea + 0.02 && polar === 0) {
        const city = n2(x * 9, y * 9, z * 9) * 0.5 + 0.5;
        const sparkle = n2(x * 40 + 5, y * 40, z * 40) * 0.5 + 0.5;
        lights[j * TEX_W + i] = clamp01((city - 0.55) * 4) * clamp01((sparkle - 0.35) * 2.2) * 255 * pal.cityLights;
      }

      // nuvens: fbm alongado na horizontal
      let cv = 0;
      amp = 0.5;
      f = 2.2;
      for (let o = 0; o < 4; o++) {
        cv += amp * n3(x * f * 1.4 + 3, y * f * 3.2, z * f * 1.4 + 9);
        amp *= 0.5;
        f *= 2;
      }
      clouds[j * TEX_W + i] = clamp01((cv + 0.5 - (1 - pal.clouds)) * 2.4) * 255;
    }
  }

  const tex = { surface, lights, clouds, palette: pal };
  textureCache.set(key, tex);
  return tex;
}

/* ── Esfera ─────────────────────────────────────────────────── */

interface SphereGeometry {
  size: number;
  /** índice do pixel → longitude base (0..1) */
  u: Float32Array;
  /** índice do pixel → linha da textura (contínua, para filtragem bilinear) */
  v: Float32Array;
  /** iluminação difusa 0..1 */
  light: Float32Array;
  /** borda (fresnel) 0..1 */
  rim: Float32Array;
  /** cobertura da borda antisserrilhada 0..1 */
  alpha: Float32Array;
}

const geoCache = new Map<number, SphereGeometry>();
const TILT = 0.38;
const LIGHT = (() => {
  const l = [-0.62, -0.42, 0.66];
  const m = Math.hypot(l[0], l[1], l[2]);
  return l.map((x) => x / m);
})();

function getGeometry(size: number): SphereGeometry {
  const hit = geoCache.get(size);
  if (hit) return hit;
  const n = size * size;
  const u = new Float32Array(n);
  const v = new Float32Array(n);
  const light = new Float32Array(n);
  const rim = new Float32Array(n);
  const alpha = new Float32Array(n);
  const R = size / 2;
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = py * size + px;
      const nx = (px + 0.5 - R) / R;
      const ny = (py + 0.5 - R) / R;
      const d2 = nx * nx + ny * ny;
      const d = Math.sqrt(d2);
      alpha[idx] = clamp01((1 - d) * R + 0.5);
      if (d2 >= 1) continue;
      const nz = Math.sqrt(1 - d2);
      // inclinação axial em torno do eixo x
      const ty = ny * ct - nz * st;
      const tz = ny * st + nz * ct;
      const lat = Math.asin(Math.max(-1, Math.min(1, -ty)));
      const lon = Math.atan2(nx, tz);
      u[idx] = lon / (Math.PI * 2) + 0.5;
      v[idx] = Math.min(TEX_H - 1.001, Math.max(0, (0.5 - lat / Math.PI) * TEX_H - 0.5));
      light[idx] = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      rim[idx] = Math.pow(1 - nz, 2.6);
    }
  }
  const geo = { size, u, v, light, rim, alpha };
  geoCache.set(size, geo);
  return geo;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

/**
 * Desenha o planeta num ImageData quadrado de `size` px.
 * `rotation` em voltas (0..1); `noise` adiciona chiado (planeta sem registro).
 */
export function renderPlanet(image: ImageData, tex: PlanetTexture, rotation: number, cloudRotation: number, noise = 0) {
  const size = image.width;
  const geo = getGeometry(size);
  const out = image.data;
  const { surface, lights, clouds, palette } = tex;
  const atm = palette.atmosphere;
  const cc = palette.cloud;

  for (let idx = 0, n = size * size; idx < n; idx++) {
    const o = idx * 4;
    const a = geo.alpha[idx];
    if (a <= 0) {
      out[o + 3] = 0;
      continue;
    }
    // filtragem bilinear: evita os blocos quando o planeta está bem perto
    const fy = geo.v[idx];
    const y0 = fy | 0;
    const wy = fy - y0;
    const r0 = y0 * TEX_W;
    const r1 = Math.min(y0 + 1, TEX_H - 1) * TEX_W;

    let uu = geo.u[idx] + rotation;
    uu -= Math.floor(uu);
    const fx = uu * TEX_W;
    const x0 = (fx | 0) % TEX_W;
    const x1 = (x0 + 1) % TEX_W;
    const wx = fx - (fx | 0);
    const w00 = (1 - wx) * (1 - wy);
    const w10 = wx * (1 - wy);
    const w01 = (1 - wx) * wy;
    const w11 = wx * wy;
    const a00 = (r0 + x0) * 3;
    const a10 = (r0 + x1) * 3;
    const a01 = (r1 + x0) * 3;
    const a11 = (r1 + x1) * 3;
    const sr = surface[a00] * w00 + surface[a10] * w10 + surface[a01] * w01 + surface[a11] * w11;
    const sg = surface[a00 + 1] * w00 + surface[a10 + 1] * w10 + surface[a01 + 1] * w01 + surface[a11 + 1] * w11;
    const sb = surface[a00 + 2] * w00 + surface[a10 + 2] * w10 + surface[a01 + 2] * w01 + surface[a11 + 2] * w11;
    const row = r0;
    const col = x0;

    let cu = geo.u[idx] + cloudRotation;
    cu -= Math.floor(cu);
    const cfx = cu * TEX_W;
    const c0 = (cfx | 0) % TEX_W;
    const c1 = (c0 + 1) % TEX_W;
    const cw = cfx - (cfx | 0);
    const cloud =
      ((clouds[r0 + c0] * (1 - cw) + clouds[r0 + c1] * cw) * (1 - wy) + (clouds[r1 + c0] * (1 - cw) + clouds[r1 + c1] * cw) * wy) / 255;

    const l = geo.light[idx];
    const day = smooth(-0.18, 0.35, l);
    const diffuse = 0.06 + 0.98 * Math.max(0, l) * 0.85 + day * 0.12;

    let r = sr * diffuse;
    let g = sg * diffuse;
    let b = sb * diffuse;

    // nuvens iluminadas
    const cl = cloud * (0.15 + 0.85 * day) * 0.85;
    r += (cc[0] * diffuse - r) * cl;
    g += (cc[1] * diffuse - g) * cl;
    b += (cc[2] * diffuse - b) * cl;

    // luzes de cidade só no lado noturno, sob as nuvens
    const night = 1 - day;
    if (night > 0.05) {
      const li = (lights[row + col] / 255) * night * (1 - cloud * 0.7);
      r += palette.lights[0] * li;
      g += palette.lights[1] * li * 0.85;
      b += palette.lights[2] * li * 0.7;
    }

    // atmosfera na borda, mais forte no lado iluminado
    const rim = geo.rim[idx] * (0.35 + 0.65 * smooth(-0.4, 0.6, l));
    r += atm[0] * rim * 0.9;
    g += atm[1] * rim * 0.9;
    b += atm[2] * rim * 0.9;

    if (noise > 0) {
      const s = (Math.random() - 0.5) * 80 * noise;
      r += s;
      g += s;
      b += s;
    }

    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = a * 255;
  }
}
