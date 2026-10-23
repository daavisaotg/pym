import { useEffect, useRef } from 'react';
import type { CityContent } from '@/data/city';
import { useRecordLinks } from '@/data';
import { Link } from '@/router/router';
import styles from './FactsDrawer.module.css';

interface Props {
  city: CityContent;
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Mostra um local (slug) no mapa. */
  onShow: (slug: string) => void;
  /** Um painel está aberto à direita: a seta se afasta dele. */
  shifted?: boolean;
}

/** A seta do canto superior direito: abre os fatos sobre a cidade. */
export function FactsDrawer({ city, open, onToggle, onShow, shifted }: Props) {
  const links = useRecordLinks();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo(0, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.documentElement.dataset.scrollLock === undefined) onToggle(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onToggle]);

  return (
    <>
      <button
        type="button"
        className={styles.arrow}
        data-open={open || undefined}
        data-shifted={shifted || undefined}
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        aria-controls="fatos-da-cidade"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 4 7 12l8 8" />
        </svg>
        <span className={styles.arrowLabel}>{open ? 'Fechar' : 'Fatos'}</span>
      </button>

      <aside id="fatos-da-cidade" className={styles.drawer} data-open={open || undefined} aria-label={`Fatos sobre ${city.name}`} aria-hidden={!open}>
        <header className={styles.head}>
          <p className={`${styles.kicker} code`}>ARQUIVO {city.code} · CURIOSIDADES</p>
          <h2 className={styles.title}>Fatos sobre {city.name}</h2>
        </header>
        <ol ref={listRef} className={styles.list} data-native-scroll>
          {city.facts.map((f, i) => {
            const ref = f.ref ? links.get(f.ref) : undefined;
            return (
              <li key={f.title} className={styles.fact} style={{ animationDelay: open ? `${80 + i * 45}ms` : '0ms' }}>
                <span className={`${styles.no} code`}>{String(i + 1).padStart(2, '0')}</span>
                <h3 className={styles.factTitle}>{f.title}</h3>
                <p className={styles.factText}>{f.text}</p>
                {(f.local || ref) && (
                  <p className={styles.actions}>
                    {f.local && (
                      <button type="button" onClick={() => onShow(f.local!)} tabIndex={open ? 0 : -1}>
                        Ver no mapa
                      </button>
                    )}
                    {ref && (
                      <Link to={ref.href} tabIndex={open ? 0 : -1}>
                        {ref.label}
                      </Link>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </aside>
    </>
  );
}
