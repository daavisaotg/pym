import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { recordPath } from '@/app/paths';
import { characterTitle, useCollection, type HallOfFameEntry } from '@/data';
import { asset } from '@/lib/asset';
import { Link, useParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import styles from './Fame.module.css';

/**
 * A constelação desenha Anthony, The Ant: antenas, olhos, mandíbula e queixo.
 * Coordenadas em porcentagem de um quadrado 100 × 100.
 */
const STARS: { x: number; y: number; part: string }[] = [
  { x: 14, y: 12, part: 'Ponta da antena esquerda' },
  { x: 28, y: 20, part: 'Antena esquerda' },
  { x: 42, y: 33, part: 'Base da antena esquerda' },
  { x: 86, y: 12, part: 'Ponta da antena direita' },
  { x: 72, y: 20, part: 'Antena direita' },
  { x: 58, y: 33, part: 'Base da antena direita' },
  { x: 30, y: 50, part: 'Olho esquerdo' },
  { x: 70, y: 50, part: 'Olho direito' },
  { x: 37, y: 66, part: 'Face esquerda' },
  { x: 63, y: 66, part: 'Face direita' },
  { x: 50, y: 77, part: 'Queixo' },
  { x: 45, y: 90, part: 'Mandíbula esquerda' },
  { x: 55, y: 90, part: 'Mandíbula direita' },
];

const LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [3, 4],
  [4, 5],
  [2, 5],
  [2, 6],
  [5, 7],
  [6, 8],
  [7, 9],
  [8, 10],
  [9, 10],
  [8, 11],
  [9, 12],
];

/** Poeira dourada de fundo, sempre na mesma posição. */
const DUST = Array.from({ length: 140 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  const c = Math.sin(i * 3.7) * 9876.54;
  return { x: (a - Math.floor(a)) * 100, y: (b - Math.floor(b)) * 100, r: 0.12 + (c - Math.floor(c)) * 0.3, d: (i % 7) * 0.6 };
});

/** Distribui as homenagens pelas estrelas: primeiro as que escolheram estrela, depois as livres. */
function assign(entries: HallOfFameEntry[]) {
  const slots: (HallOfFameEntry | undefined)[] = new Array(STARS.length).fill(undefined);
  const rest: HallOfFameEntry[] = [];
  for (const e of entries) {
    if (typeof e.star === 'number' && e.star >= 0 && e.star < STARS.length && !slots[e.star]) slots[e.star] = e;
    else rest.push(e);
  }
  for (const e of rest) {
    const free = slots.findIndex((s) => !s);
    if (free === -1) break;
    slots[free] = e;
  }
  return slots;
}

export default function FamePage() {
  const { data: entries } = useCollection('fame');
  const { data: characters } = useCollection('characters');
  const slots = useMemo(() => assign(entries), [entries]);
  const [active, setActive] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const params = useParams<{ '*': string }>();

  // /fama/<slug> já abre a homenagem pedida (links da busca global)
  useEffect(() => {
    const slug = params['*'];
    if (!slug) return;
    const i = slots.findIndex((e) => e?.slug === slug);
    if (i !== -1) setPinned(i);
  }, [params, slots]);

  const shown = active ?? pinned;
  const entry = shown !== null ? slots[shown] : undefined;
  const character = entry?.character ? characters.find((c) => c.id === entry.character) : undefined;
  const honored = slots.filter(Boolean).length;
  const litLines = (i: number) => LINES.filter(([a, b]) => a === i || b === i);

  return (
    <div className={styles.page}>
      <Seo title="Hall da Fama" description="As maiores figuras da história do PYM, gravadas numa constelação dourada." />

      <section className={styles.sky}>
        <div className={`container ${styles.layout}`}>
          <header className={styles.head}>
            <p className={`${styles.kicker} code`}>MÓDULO HF</p>
            <h1 className={styles.h1}>Hall da Fama</h1>
            <p className={styles.lede}>
              Cada estrela guarda uma das maiores figuras da história do RP. Juntas, desenham Anthony: antes de qualquer herói,
              a protagonista é a comunidade.
            </p>
            <p className={styles.count}>
              <span className="code">{String(honored).padStart(2, '0')}</span> de{' '}
              <span className="code">{String(STARS.length).padStart(2, '0')}</span> estrelas acesas
            </p>
          </header>

          <div className={styles.chart} onMouseLeave={() => setActive(null)}>
            <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <radialGradient id="star-core">
                  <stop offset="0" stopColor="#fff6dc" />
                  <stop offset="0.45" stopColor="#e2bd62" />
                  <stop offset="1" stopColor="#e2bd62" stopOpacity="0" />
                </radialGradient>
              </defs>
              {DUST.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} className={styles.dust} style={{ animationDelay: `${d.d}s` }} />
              ))}
              {LINES.map(([a, b], i) => {
                const lit = shown !== null && (a === shown || b === shown);
                return (
                  <line
                    key={i}
                    x1={STARS[a].x}
                    y1={STARS[a].y}
                    x2={STARS[b].x}
                    y2={STARS[b].y}
                    className={styles.line}
                    data-lit={lit || undefined}
                    style={{ animationDelay: `${300 + i * 90}ms` }}
                  />
                );
              })}
            </svg>

            {STARS.map((s, i) => {
              const e = slots[i];
              return (
                <button
                  key={i}
                  type="button"
                  className={styles.star}
                  data-filled={e ? '' : undefined}
                  data-active={shown === i || undefined}
                  data-neighbor={shown !== null && litLines(shown).some(([a, b]) => a === i || b === i) ? '' : undefined}
                  style={{ left: `${s.x}%`, top: `${s.y}%`, '--delay': `${i * 120}ms` } as CSSProperties}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onClick={() => setPinned(pinned === i ? null : i)}
                  aria-pressed={pinned === i}
                  aria-label={e ? `${e.name}: ${e.reason}` : `Estrela ${i + 1}, vaga aberta`}
                >
                  <span className={styles.halo} />
                  <span className={styles.core} />
                  {e && <span className={styles.starName}>{e.name}</span>}
                </button>
              );
            })}
          </div>

          <aside className={styles.card} aria-live="polite" data-empty={!entry || undefined} data-idle={shown === null || undefined}>
            {shown === null ? (
              <>
                <p className={`${styles.cardKicker} code`}>CONSTELAÇÃO DE ANTHONY</p>
                <p className={styles.cardTitle}>Passe o mouse sobre uma estrela</p>
                <p className={styles.cardText}>No celular, toque numa estrela para ver a homenagem.</p>
              </>
            ) : entry ? (
              <>
                <div className={styles.portrait}>
                  {entry.image ? <img src={asset(entry.image)} alt={entry.name} /> : <span>{entry.name.charAt(0)}</span>}
                </div>
                <p className={`${styles.cardKicker} code`}>
                  ESTRELA {String(shown + 1).padStart(2, '0')}
                  {entry.category ? ` · ${entry.category.toUpperCase()}` : ''}
                </p>
                <p className={styles.cardTitle}>{entry.name}</p>
                {entry.period && <p className={styles.period}>{entry.period}</p>}
                <p className={styles.reason}>{entry.reason}</p>
                {entry.description && <p className={styles.cardText}>{entry.description}</p>}
                {character && (
                  <Link to={recordPath.characters(character.slug)} className={styles.cardLink}>
                    Ver ficha de {characterTitle(character)}
                  </Link>
                )}
              </>
            ) : (
              <>
                <p className={`${styles.cardKicker} code`}>ESTRELA {String(shown + 1).padStart(2, '0')} · {STARS[shown].part.toUpperCase()}</p>
                <p className={styles.cardTitle}>Vaga aberta</p>
                <p className={styles.cardText}>Esta estrela aguarda uma homenagem.</p>
              </>
            )}
          </aside>
        </div>
      </section>

      {honored > 0 && (
        <section className={`container ${styles.listSection}`} aria-labelledby="homenageados">
          <h2 id="homenageados" className={styles.h2}>
            Homenageados
          </h2>
          <ul className={styles.list}>
            {slots.map((e, i) =>
              e ? (
                <li key={e.id} className={styles.listItem}>
                  <span className={`${styles.listStar} code`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.listName}>{e.name}</span>
                  {e.category && <span className={styles.listCat}>{e.category}</span>}
                  <span className={styles.listReason}>{e.reason}</span>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
