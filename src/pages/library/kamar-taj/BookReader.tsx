import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Book, BookPage } from '@/data/magic';
import { asset, prefersReducedMotion } from '@/lib/asset';
import { Icon } from '@/components/ui/Icon';
import { Mandala } from '@/components/library/Mandala';
import { shelfLabel } from './shelves';
import { ArcaneSketch } from './ArcaneSketch';
import styles from './BookReader.module.css';

type Face =
  | { kind: 'cover' }
  | { kind: 'exlibris' }
  | { kind: 'page'; page: BookPage; n: number }
  | { kind: 'lost' }
  | { kind: 'end' }
  | { kind: 'verso' };

type Side = 'front' | 'back';

/* ── Utilidades determinísticas ─────────────────────────────── */

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/** Borda rasgada: polígono do toco de papel que sobrou junto à lombada. */
function tearPath(seed: string, side: Side, width = 30) {
  const r = seeded(seed);
  const pts: string[] = [];
  for (let y = 0; y <= 100; y += 3) {
    const x = width + (r() - 0.5) * 9 + Math.sin(y / 9) * 3;
    pts.push(side === 'front' ? `${x.toFixed(1)}% ${y}%` : `${(100 - x).toFixed(1)}% ${y}%`);
  }
  return side === 'front' ? `polygon(0 0, ${pts.join(', ')}, 0 100%)` : `polygon(100% 0, ${pts.join(', ')}, 100% 100%)`;
}

/** Texto falso para páginas borradas (fica ilegível de propósito). */
function pseudoText(seed: string, words = 110) {
  const r = seeded(seed);
  const letters = 'aeiouaeioumnrstlcdpvgbhqf';
  const out: string[] = [];
  for (let i = 0; i < words; i++) {
    const len = 2 + Math.floor(r() * 8);
    let w = '';
    for (let k = 0; k < len; k++) w += letters[Math.floor(r() * letters.length)];
    out.push(w);
  }
  return out.join(' ');
}

/* ── Faces ──────────────────────────────────────────────────── */

/** Posição da marca de copo, diferente em cada página. */
function stainStyle(seed: string): CSSProperties {
  const r = seeded(seed);
  return { '--sx': `${Math.round(15 + r() * 70)}%`, '--sy': `${Math.round(r() > 0.5 ? 12 + r() * 15 : 72 + r() * 18)}%`, opacity: r() > 0.35 ? 1 : 0 } as CSSProperties;
}

interface ShellProps {
  children: ReactNode;
  side: Side;
  seed: string;
  /** Número impresso no rodapé */
  number?: number;
  className?: string;
  /** Página reconstituída pelo arquivo */
  restored?: boolean;
  /** Esconde o esboço do fundo */
  plain?: boolean;
}

function PageShell({ children, side, seed, number, className, restored, plain }: ShellProps) {
  return (
    <div className={[styles.paper, className].filter(Boolean).join(' ')} data-side={side}>
      <span className={styles.stains} aria-hidden="true" style={stainStyle(seed)} />
      {!plain && <ArcaneSketch seed={seed} />}
      <div className={styles.paperInner} data-native-scroll>
        {children}
      </div>
      {restored && (
        <span className={styles.restored} title="Página reconstituída pelo arquivo a partir dos registros conhecidos. Aguardando revisão da staff.">
          Restaurada
        </span>
      )}
      {number !== undefined && <span className={styles.folio}>{number}</span>}
    </div>
  );
}

function Cover({ book }: { book: Book }) {
  return (
    <div className={styles.cover} style={{ '--leather': book.color ?? '#5c1410' } as CSSProperties}>
      <div className={styles.coverFrame}>
        <span className={styles.coverEmblem}>
          <Mandala variant="icon" />
        </span>
        <span className={styles.coverTitle}>{book.title}</span>
        <span className={styles.coverKind}>{book.kind}</span>
        <span className={styles.coverShelf}>{shelfLabel(book.shelf)}</span>
      </div>
    </div>
  );
}

function ExLibris({ book, side, seed }: { book: Book; side: Side; seed: string }) {
  const pages = book.pages ?? [];
  const readable = pages.filter((p) => p.type === 'feitiço' || p.type === 'texto').length;
  const restored = pages.filter((p) => (p.type === 'feitiço' || p.type === 'texto') && p.restored).length;
  const damaged = pages.length - readable;
  return (
    <PageShell side={side} seed={seed} plain>
      <div className={styles.exlibris}>
        <p className={styles.exTop}>Ex libris</p>
        <p className={styles.exHouse}>Biblioteca de Kamar-Taj</p>
        <span className={styles.exMandala}>
          <Mandala variant="icon" />
        </span>
        <p className={styles.exTitle}>{book.title}</p>
        <p className={styles.exKind}>{book.kind}</p>
        {book.summary && <p className={styles.exSummary}>{book.summary}</p>}
        <dl className={styles.exFacts}>
          <div>
            <dt>Acervo</dt>
            <dd>{shelfLabel(book.shelf)}</dd>
          </div>
          {book.classification && (
            <div>
              <dt>Classificação no tomo</dt>
              <dd>{book.classification}</dd>
            </div>
          )}
          <div>
            <dt>Páginas legíveis</dt>
            <dd>{readable}</dd>
          </div>
          {restored > 0 && (
            <div>
              <dt>Restauradas pelo arquivo</dt>
              <dd>{restored}</dd>
            </div>
          )}
          {damaged > 0 && (
            <div>
              <dt>Danificadas na raid</dt>
              <dd>{damaged}</dd>
            </div>
          )}
        </dl>
        <span className={styles.stamp}>Acervo {shelfLabel(book.shelf)}</span>
      </div>
    </PageShell>
  );
}

type PageProps<T extends BookPage['type']> = { page: Extract<BookPage, { type: T }>; side: Side; seed: string; number: number };

function SpellPage({ page, side, seed, number }: PageProps<'feitiço'>) {
  return (
    <PageShell side={side} seed={seed} number={number} restored={page.restored}>
      <p className={styles.rubric}>{page.label}</p>
      <h3 className={styles.pageTitle}>{page.title}</h3>
      <svg className={styles.flourish} viewBox="0 0 200 12" aria-hidden="true">
        <path d="M2 6 C40 -2 70 14 100 6 S160 -2 198 6" />
        <circle cx="100" cy="6" r="2.2" />
      </svg>
      {page.quote && <blockquote className={styles.quote}>“{page.quote}”</blockquote>}
      <p className={styles.unlock}>
        <span>Feitiço desbloqueado</span>
        <strong>{page.spell}</strong>
      </p>
      <p className={`${styles.desc} ${styles.dropcap}`}>{page.description}</p>
      {page.image && <img className={styles.illustration} src={asset(page.image)} alt="" loading="lazy" />}
      <p className={styles.mana}>
        <span className={styles.manaIcon}>
          <Mandala variant="icon" />
        </span>
        <span>
          <span className={styles.manaLabel}>Custo de Mana</span>
          {page.mana}
        </span>
      </p>
    </PageShell>
  );
}

function TextPage({ page, side, seed, number }: PageProps<'texto'>) {
  return (
    <PageShell side={side} seed={seed} number={number} restored={page.restored}>
      {page.title && <h3 className={styles.pageTitle}>{page.title}</h3>}
      {page.title && (
        <svg className={styles.flourish} viewBox="0 0 200 12" aria-hidden="true">
          <path d="M2 6 C40 -2 70 14 100 6 S160 -2 198 6" />
          <circle cx="100" cy="6" r="2.2" />
        </svg>
      )}
      <div className={styles.textBlocks}>
        {page.blocks.map((b, i) =>
          typeof b === 'string' ? (
            <p key={i} className={i === 0 ? styles.dropcap : undefined}>
              {b}
            </p>
          ) : 'heading' in b ? (
            <h4 key={i}>{b.heading}</h4>
          ) : (
            <p key={i}>
              <em>{b.speaker}:</em> {b.text}
            </p>
          ),
        )}
      </div>
      {page.facts?.length ? (
        <dl className={styles.pageFacts}>
          {page.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </PageShell>
  );
}

function TornPage({ seed, side, label, note }: { seed: string; side: Side; label?: string; note?: string }) {
  return (
    <div className={styles.torn} data-side={side}>
      <div className={styles.stub} style={{ clipPath: tearPath(seed, side) }}>
        {label && <span className={styles.stubLabel}>{label}</span>}
      </div>
      <div className={styles.tornNote}>
        <span className={styles.tornTitle}>Página arrancada</span>
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}

function BlurredPage({ seed, side, label, note, number }: { seed: string; side: Side; label?: string; note?: string; number?: number }) {
  const text = useMemo(() => pseudoText(seed), [seed]);
  return (
    <PageShell side={side} seed={seed} number={number} className={styles.blurred}>
      {label && <p className={styles.rubric}>{label}</p>}
      <div className={styles.smudge} aria-hidden="true">
        <p className={styles.smudgeTitle}>{pseudoText(`${seed}t`, 3)}</p>
        <p>{text}</p>
        <p>{pseudoText(`${seed}b`, 60)}</p>
      </div>
      <p className={styles.blurNote}>{note ?? 'Tinta borrada. O texto desta página está ilegível.'}</p>
    </PageShell>
  );
}

function FaceView({ face, book, side, seed }: { face: Face; book: Book; side: Side; seed: string }) {
  switch (face.kind) {
    case 'cover':
      return <Cover book={book} />;
    case 'exlibris':
      return <ExLibris book={book} side={side} seed={seed} />;
    case 'lost':
      return <TornPage seed={seed} side={side} note="Nenhuma página deste tomo foi recuperada depois da raid." />;
    case 'end':
      return (
        <PageShell side={side} seed={seed}>
          <div className={styles.end}>
            <span className={styles.endMandala}>
              <Mandala variant="icon" />
            </span>
            <p>Fim das páginas recuperadas.</p>
          </div>
        </PageShell>
      );
    case 'verso':
      return <div className={styles.verso} />;
    case 'page': {
      const p = face.page;
      const number = face.n + 1;
      if (p.type === 'feitiço') return <SpellPage page={p} side={side} seed={seed} number={number} />;
      if (p.type === 'texto') return <TextPage page={p} side={side} seed={seed} number={number} />;
      if (p.type === 'rasgada') return <TornPage seed={seed} side={side} label={p.label} note={p.note} />;
      return <BlurredPage seed={seed} side={side} label={p.label} note={p.note} number={number} />;
    }
  }
}

/* ── Leitor ─────────────────────────────────────────────────── */

function useIsSpread() {
  const query = '(min-width: 900px) and (min-height: 560px)';
  const [spread, setSpread] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setSpread(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return spread;
}

interface Props {
  book: Book;
  onClose: () => void;
}

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Grenze+Gotisch:wght@500..700&family=IM+Fell+English:ital@0;1&display=swap';

/** Carrega as fontes do grimório na primeira vez que um livro é aberto. */
function useGrimoireFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_URL}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
  }, []);
}

export function BookReader({ book, onClose }: Props) {
  useGrimoireFonts();
  const spread = useIsSpread();
  const reduced = prefersReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Lista de faces na ordem de leitura
  const faces = useMemo<Face[]>(() => {
    const list: Face[] = [{ kind: 'cover' }, { kind: 'exlibris' }];
    const pages = book.pages ?? [];
    if (pages.length) pages.forEach((page, n) => list.push({ kind: 'page', page, n }));
    else list.push({ kind: 'lost' });
    if (!spread || list.length % 2 === 1) list.push({ kind: 'end' });
    return list;
  }, [book, spread]);

  // Folhas: no desktop cada folha tem frente e verso; no celular, o verso fica em branco.
  const leaves = useMemo(() => {
    if (spread) {
      const out: [Face, Face][] = [];
      for (let i = 0; i < faces.length; i += 2) out.push([faces[i], faces[i + 1] ?? { kind: 'verso' }]);
      return out;
    }
    return faces.map((f) => [f, { kind: 'verso' } as Face] as [Face, Face]);
  }, [faces, spread]);

  const maxFlip = spread ? leaves.length : leaves.length - 1;
  const [flipped, setFlipped] = useState(reduced ? 1 : 0);
  const [turning, setTurning] = useState<number | null>(null);
  const flippedRef = useRef(flipped);
  flippedRef.current = flipped;
  const turnTimer = useRef(0);

  const go = useCallback(
    (to: number) => {
      const f = flippedRef.current;
      const target = Math.max(0, Math.min(maxFlip, to));
      if (target === f) return;
      // a folha que está virando fica por cima das outras durante a animação
      setTurning(target > f ? f : target);
      setFlipped(target);
      flippedRef.current = target;
      window.clearTimeout(turnTimer.current);
      turnTimer.current = window.setTimeout(() => setTurning(null), reduced ? 0 : 950);
    },
    [maxFlip, reduced],
  );

  const next = useCallback(() => go(flippedRef.current + 1), [go]);
  const prev = useCallback(() => go(flippedRef.current - 1), [go]);

  // O livro abre sozinho logo depois de aparecer
  useEffect(() => {
    if (reduced) return;
    const t = window.setTimeout(() => go(1), 750);
    return () => window.clearTimeout(t);
  }, [go, reduced]);

  useEffect(() => {
    setFlipped((f) => Math.min(f, maxFlip));
  }, [maxFlip]);

  // Teclado, trava de rolagem e foco
  useEffect(() => {
    const root = document.documentElement;
    const prevFocus = document.activeElement as HTMLElement | null;
    root.dataset.scrollLock = '';
    root.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete root.dataset.scrollLock;
      root.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [next, prev, onClose]);

  // Deslizar no toque
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const L = leaves.length;
  const shift = spread ? (flipped === 0 ? -0.5 : flipped === L ? 0.5 : 0) : 0;
  const atEnd = flipped >= maxFlip;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Livro: ${book.title}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <header className={styles.bar}>
        <div className={styles.barTitle}>
          <span className={`${styles.barShelf} code`}>{shelfLabel(book.shelf).toUpperCase()}</span>
          <span className={styles.barName}>{book.title}</span>
        </div>
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Fechar livro">
          <Icon name="close" size={20} />
        </button>
      </header>

      <div
        className={styles.stage}
        data-spread={spread || undefined}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        onPointerDown={(e) => {
          if (e.pointerType === 'touch') swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipe.current;
          swipe.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(e.clientY - s.y)) (dx < 0 ? next : prev)();
        }}
      >
        <div className={styles.viewport}>
          <div className={styles.book} style={{ '--shift': shift } as CSSProperties} data-closed={flipped === 0 || undefined}>
            {spread && flipped === L && <div className={styles.backBoard} style={{ '--leather': book.color ?? '#5c1410' } as CSSProperties} />}
            {leaves.map(([front, back], k) => {
              const isFlipped = k < flipped;
              const z = turning === k ? L + 10 : isFlipped ? k + 1 : L - k + 1;
              return (
                <div
                  key={k}
                  className={styles.leaf}
                  data-flipped={isFlipped || undefined}
                  data-turning={turning === k || undefined}
                  style={{ zIndex: z }}
                >
                  <div
                    className={styles.face}
                    data-face="front"
                    onClick={() => !isFlipped && next()}
                    aria-hidden={isFlipped || k > flipped}
                  >
                    <FaceView face={front} book={book} side="front" seed={`${book.id}-${k}-f`} />
                  </div>
                  <div
                    className={styles.face}
                    data-face="back"
                    onClick={() => isFlipped && prev()}
                    aria-hidden={!isFlipped || k < flipped - 1}
                  >
                    <FaceView face={back} book={book} side="back" seed={`${book.id}-${k}-b`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <footer className={styles.controls}>
        <button type="button" onClick={prev} disabled={flipped === 0} aria-label="Página anterior">
          ‹
        </button>
        <span className={styles.progress} aria-live="polite">
          <span className={styles.progressBar}>
            <span style={{ transform: `scaleX(${maxFlip ? flipped / maxFlip : 1})` }} />
          </span>
          <span className="code">
            {flipped === 0 ? 'Capa' : atEnd && spread && flipped === L ? 'Contracapa' : `Folha ${flipped} de ${maxFlip}`}
          </span>
        </span>
        <button type="button" onClick={next} disabled={atEnd} aria-label="Próxima página">
          ›
        </button>
      </footer>
      <p className={styles.hint}>{spread ? 'Clique na página ou use ← → para folhear. Esc fecha o livro.' : 'Toque na página ou deslize para folhear.'}</p>
    </div>,
    document.body,
  );
}
