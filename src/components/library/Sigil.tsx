import type { ReactElement } from 'react';
import type { LibraryCategory } from '@/data/types';
import styles from './Sigil.module.css';

/** Hash estável de texto → número. Mesmo nome, mesmo selo. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const polar = (r: number, a: number) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)] as const;

function polygon(n: number, r: number, rot: number) {
  return Array.from({ length: n }, (_, i) => polar(r, rot + (i / n) * Math.PI * 2).map((v) => v.toFixed(2)).join(',')).join(' ');
}

function star(n: number, r1: number, r2: number, rot: number) {
  return Array.from({ length: n * 2 }, (_, i) =>
    polar(i % 2 ? r2 : r1, rot + (i / (n * 2)) * Math.PI * 2)
      .map((v) => v.toFixed(2))
      .join(','),
  ).join(' ');
}

/** Contorno ondulado (simbiontes): raio oscila em lóbulos. */
function blob(lobes: number, r: number, amp: number, rot: number) {
  const pts = 72;
  let d = '';
  for (let i = 0; i <= pts; i++) {
    const a = rot + (i / pts) * Math.PI * 2;
    const rr = r + Math.sin(a * lobes) * amp + Math.sin(a * (lobes + 3)) * amp * 0.35;
    const [x, y] = polar(rr, a);
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

interface Props {
  name: string;
  category: LibraryCategory;
  className?: string;
}

/**
 * Selo gerado para verbetes sem imagem. Cada categoria tem um motivo próprio
 * e cada nome gera variações únicas (pontas, marcas, rotação).
 */
export function Sigil({ name, category, className }: Props) {
  const h = hash(name);
  const r = rng(h);
  const rot = r() * Math.PI;
  const ticks = 18 + Math.floor(r() * 4) * 6;
  const sides = 3 + Math.floor(r() * 5);
  const initial = name.replace(/^(o|a|os|as)\s+/i, '').charAt(0).toUpperCase();

  let motif: ReactElement;
  switch (category) {
    case 'artefatos':
      motif = (
        <>
          <polygon points={polygon(4, 30, rot / 4 + Math.PI / 4)} className={styles.line} />
          <polygon points={polygon(4, 21, rot / 4)} className={styles.accent} />
          <polygon points={polygon(sides, 13, rot)} className={styles.line} />
        </>
      );
      break;
    case 'raças': {
      const dots = 5 + Math.floor(r() * 5);
      motif = (
        <>
          <circle cx="50" cy="50" r="27" className={styles.line} />
          {Array.from({ length: dots }, (_, i) => {
            const [x, y] = polar(27, rot + (i / dots) * Math.PI * 2);
            return <circle key={i} cx={x} cy={y} r="3.2" className={styles.dot} />;
          })}
          <polygon points={polygon(dots, 16, rot)} className={styles.accent} />
        </>
      );
      break;
    }
    case 'pactos':
      motif = (
        <>
          <polygon points={polygon(3, 30, Math.PI / 2)} className={styles.line} />
          <polygon points={polygon(3, 30, -Math.PI / 2)} className={styles.accent} />
          <ellipse cx="50" cy="50" rx="11" ry="6" className={styles.line} />
          <circle cx="50" cy="50" r="3" className={styles.dot} />
        </>
      );
      break;
    case 'tropas': {
      const points = 5 + Math.floor(r() * 4);
      motif = (
        <>
          <polygon points={star(points, 31, 13, -Math.PI / 2)} className={styles.accent} />
          <circle cx="50" cy="50" r="10" className={styles.line} />
        </>
      );
      break;
    }
    case 'simbiontes':
      motif = (
        <>
          <path d={blob(5 + Math.floor(r() * 3), 24, 5, rot)} className={styles.accent} />
          <path d={blob(3 + Math.floor(r() * 3), 15, 3.5, -rot)} className={styles.line} />
        </>
      );
      break;
    default:
      motif = <polygon points={polygon(sides, 26, rot)} className={styles.accent} />;
  }

  return (
    <svg className={[styles.sigil, className].filter(Boolean).join(' ')} viewBox="0 0 100 100" aria-hidden="true" data-category={category}>
      <circle cx="50" cy="50" r="46" className={styles.ring} />
      <circle cx="50" cy="50" r="41" className={styles.ringThin} />
      {Array.from({ length: ticks }, (_, i) => {
        const a = (i / ticks) * Math.PI * 2 + rot;
        const long = i % 3 === 0;
        const [x1, y1] = polar(41, a);
        const [x2, y2] = polar(long ? 36 : 38.5, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={styles.tick} />;
      })}
      {motif}
      <text x="50" y="50" className={styles.letter} textAnchor="middle" dominantBaseline="central">
        {initial}
      </text>
    </svg>
  );
}
