import styles from './BookReader.module.css';

/** Gerador simples e estável a partir de texto. */
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

const P = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;

/** Anel de contas, como nos estudos do Olho de Agamotto. */
function Beads({ cx, cy, r, n, size }: { cx: number; cy: number; r: number; n: number; size: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = P(cx, cy, r, (i / n) * Math.PI * 2);
        return <circle key={i} cx={x} cy={y} r={size} />;
      })}
    </>
  );
}

function Eye() {
  return (
    <g>
      <path d="M10 100 Q100 20 190 100 Q100 180 10 100Z" />
      <path d="M22 100 Q100 38 178 100 Q100 162 22 100Z" />
      <circle cx="100" cy="100" r="34" />
      <circle cx="100" cy="100" r="15" className={styles.sketchFill} />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const [x1, y1] = P(100, 100, 38, a);
        const [x2, y2] = P(100, 100, 46, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <path d="M100 6 L100 30 M100 170 L100 194 M4 100 L-14 100 M196 100 L214 100" />
    </g>
  );
}

function Circle({ r: rand }: { r: () => number }) {
  const sides = 3 + Math.floor(rand() * 4);
  const pts = (rad: number, rot: number) =>
    Array.from({ length: sides }, (_, i) => P(100, 100, rad, rot + (i / sides) * Math.PI * 2).join(',')).join(' ');
  return (
    <g>
      <circle cx="100" cy="100" r="92" />
      <circle cx="100" cy="100" r="84" />
      <Beads cx={100} cy={100} r={88} n={28} size={2.4} />
      <polygon points={pts(80, -Math.PI / 2)} />
      <polygon points={pts(80, Math.PI / 2)} />
      <circle cx="100" cy="100" r="40" />
      <circle cx="100" cy="100" r="26" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const [x1, y1] = P(100, 100, 40, a);
        const [x2, y2] = P(100, 100, 26, a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
      <circle cx="100" cy="100" r="6" className={styles.sketchFill} />
    </g>
  );
}

function Construction({ r: rand }: { r: () => number }) {
  const n = 3 + Math.floor(rand() * 3);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = P(100, 100, 34, (i / n) * Math.PI * 2 + rand());
        return <circle key={i} cx={x} cy={y} r={52} />;
      })}
      <circle cx="100" cy="100" r="86" strokeDasharray="3 5" />
      <path d="M14 100 H186 M100 14 V186" />
      <path d="M40 40 L160 160 M160 40 L40 160" strokeDasharray="2 6" />
      <Beads cx={100} cy={100} r={18} n={10} size={2} />
    </g>
  );
}

/**
 * Esboço arcano em sépia ao fundo das páginas, como os estudos a lápis do grimório
 * de referência. Cada página recebe um desenho, posição e rotação próprios.
 */
export function ArcaneSketch({ seed }: { seed: string }) {
  const r = rng(seed);
  const kind = Math.floor(r() * 3);
  const corner = Math.floor(r() * 4);
  const size = 55 + r() * 30;
  const rot = Math.round((r() - 0.5) * 50);
  const pos: Record<number, { top?: string; bottom?: string; left?: string; right?: string }> = {
    0: { top: '-6%', right: '-14%' },
    1: { bottom: '-8%', left: '-16%' },
    2: { top: '-4%', left: '-18%' },
    3: { bottom: '-6%', right: '-12%' },
  };
  return (
    <svg
      className={styles.sketch}
      viewBox="-20 -20 240 240"
      aria-hidden="true"
      style={{ width: `${size}%`, transform: `rotate(${rot}deg)`, ...pos[corner] }}
    >
      {kind === 0 ? <Eye /> : kind === 1 ? <Circle r={r} /> : <Construction r={r} />}
    </svg>
  );
}
