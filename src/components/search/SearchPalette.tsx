import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { navModules } from '@/app/modules';
import { useLocation, useNavigate } from '@/router/router';
import { normalize } from '@/lib/asset';
import { Icon } from '@/components/ui/Icon';
import { groups, loadIndex, search, type SearchEntry } from './searchIndex';
import styles from './SearchPalette.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const groupLabel = Object.fromEntries(groups.map((g) => [g.id, g.label])) as Record<string, string>;

/** Destaca no título os trechos que casaram com a busca. */
function highlight(title: string, query: string): ReactNode {
  const tokens = normalize(query).split(/\s+/).filter((t) => t.length > 0);
  if (!tokens.length) return title;
  const n = normalize(title);
  const marks = new Array<boolean>(title.length).fill(false);
  for (const t of tokens) {
    let from = 0;
    let i: number;
    while ((i = n.indexOf(t, from)) !== -1) {
      for (let k = i; k < i + t.length && k < marks.length; k++) marks[k] = true;
      from = i + t.length;
    }
  }
  const out: ReactNode[] = [];
  let buf = '';
  let state = marks[0];
  for (let i = 0; i <= title.length; i++) {
    if (i === title.length || marks[i] !== state) {
      if (buf) out.push(state ? <mark key={i}>{buf}</mark> : buf);
      buf = '';
      state = marks[i];
    }
    if (i < title.length) buf += title[i];
  }
  return out;
}

export default function SearchPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listId = useId();

  useEffect(() => {
    loadIndex().then(setIndex);
  }, []);

  // Abre: guarda o foco, trava a rolagem do fundo, foca o campo.
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement;
    const root = document.documentElement;
    root.dataset.scrollLock = '';
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      delete root.dataset.scrollLock;
      root.style.overflow = prevOverflow;
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo<SearchEntry[]>(() => {
    if (!index) return [];
    if (!query.trim()) {
      // Sem texto: atalhos para os módulos e as Terras registradas.
      const shortcuts = navModules
        .map((m) => index.find((e) => e.key === `module:${m.id}`))
        .filter((e): e is SearchEntry => Boolean(e));
      const earths = index.filter((e) => e.group === 'earths');
      return [...earths, ...shortcuts];
    }
    return search(index, query);
  }, [index, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (entry: SearchEntry) => {
    onClose();
    if (/^https?:/.test(entry.href)) {
      window.open(entry.href, '_blank', 'noopener,noreferrer');
      return;
    }
    const [path, anchor] = entry.href.split('#');
    const target = path || '/';
    const scroll = () => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (target !== pathname) {
      navigate(target);
      if (anchor) setTimeout(scroll, 120);
    } else if (anchor) {
      setTimeout(scroll, 60);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Tab') {
      // Mantém o foco dentro do diálogo.
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  if (!open) return null;

  const empty = !query.trim();
  let lastGroup = '';

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Buscar no arquivo" onKeyDown={onKeyDown}>
        <div className={styles.field}>
          <Icon name="search" size={20} className={styles.fieldIcon} />
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar personagens, Terras, facções, locais…"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button className={styles.close} onClick={onClose} aria-label="Fechar busca">
            <span className={styles.esc}>Esc</span>
            <Icon name="close" size={18} className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.results} ref={listRef} id={listId} role="listbox" data-native-scroll>
          {!index && <p className={styles.status}>Indexando o arquivo…</p>}

          {index && !empty && results.length === 0 && (
            <div className={styles.none}>
              <p className={styles.noneTitle}>Nenhum registro para “{query.trim()}”.</p>
              <p className={styles.noneHint}>
                Confira a grafia ou tente um termo mais curto. A busca cobre personagens, Terras, eventos, facções,
                notícias, biblioteca, mapas e fama.
              </p>
            </div>
          )}

          {results.map((r, i) => {
            const heading = empty ? (r.group === 'earths' ? 'Terras registradas' : 'Módulos do arquivo') : groupLabel[r.group];
            const showHeading = heading !== lastGroup;
            lastGroup = heading;
            return (
              <div key={r.key}>
                {showHeading && (
                  <div className={styles.group} role="presentation">
                    {heading}
                  </div>
                )}
                <div
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  className={styles.option}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(r)}
                >
                  <span className={`${styles.code} code`}>{r.code ?? ''}</span>
                  <span className={styles.text}>
                    <span className={styles.title}>{highlight(r.title, query)}</span>
                    {r.subtitle && <span className={styles.subtitle}>{r.subtitle}</span>}
                  </span>
                  <Icon name={/^https?:/.test(r.href) ? 'arrow-up-right' : 'enter'} size={16} className={styles.enter} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navegar
          </span>
          <span>
            <kbd>Enter</kbd> abrir
          </span>
          <span>
            <kbd>Esc</kbd> fechar
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
