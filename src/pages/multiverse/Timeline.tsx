import { Fragment, useEffect, useRef, useState } from 'react';
import type { EventKind, TimelineEvent } from '@/data/types';
import { kindFilters, kindLabel } from './eventKinds';
import styles from './Timeline.module.css';

interface Props {
  events: TimelineEvent[];
  activeSlug?: string;
  onOpen: (slug: string) => void;
}

/** Linha do tempo horizontal: arraste, use as setas ou role de lado. */
export function Timeline({ events, activeSlug, onOpen }: Props) {
  const [filter, setFilter] = useState<EventKind | 'todos'>('todos');
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const ordered = [...events].sort((a, b) => a.order - b.order);
  const visible = filter === 'todos' ? ordered : ordered.filter((e) => e.kind === filter);
  const current = ordered.find((e) => e.current);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };

  useEffect(updateEdges, [filter, events.length]);

  // Arrastar com o mouse para rolar a linha
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let drag: { x: number; left: number; moved: boolean } | null = null;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: el.scrollLeft, moved: false };
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 4) {
        drag.moved = true;
        el.dataset.dragging = '';
      }
      el.scrollLeft = drag.left - dx;
    };
    const up = () => {
      if (drag?.moved) {
        // evita que o fim do arraste conte como clique num cartão
        const block = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener('click', block, { capture: true, once: true });
        setTimeout(() => el.removeEventListener('click', block, { capture: true }), 0);
      }
      drag = null;
      delete el.dataset.dragging;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const scrollBy = (dir: number) => {
    const el = trackRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const goToCurrent = () => {
    if (!current) return;
    setFilter('todos');
    requestAnimationFrame(() => {
      trackRef.current
        ?.querySelector<HTMLElement>(`[data-slug="${current.slug}"]`)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  };

  let lastEra = '';

  return (
    <section id="linha-do-tempo" className={styles.wrap} aria-labelledby="timeline-titulo">
      <div className={`container ${styles.head}`}>
        <div>
          <h2 id="timeline-titulo" className={styles.h2}>
            Linha do tempo
          </h2>
          <p className={styles.intro}>
            Os capítulos do RP em ordem, dos registros históricos à temporada atual. Datas da cronologia interna.
          </p>
        </div>
        <div className={styles.tools}>
          <div className={styles.chips} role="radiogroup" aria-label="Tipo de evento">
            {kindFilters.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={filter === k.id}
                className={styles.chip}
                onClick={() => setFilter(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
          {current && (
            <button type="button" className={styles.currentBtn} onClick={goToCurrent}>
              <span className={styles.liveDot} />
              {current.season ?? 'Atual'}: {current.name}
            </button>
          )}
        </div>
      </div>

      <div className={styles.viewport}>
        <button type="button" className={styles.arrow} data-dir="prev" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label="Eventos anteriores">
          ‹
        </button>
        <div ref={trackRef} className={styles.track} onScroll={updateEdges} data-native-scroll>
          <ol className={styles.list}>
            {visible.map((e) => {
              const era = e.kind === 'histórico' ? 'Antes do RP' : 'No RP';
              const showEra = era !== lastEra;
              lastEra = era;
              return (
                <Fragment key={e.id}>
                  {showEra && (
                    <li className={styles.era} aria-hidden="true">
                      <span>{era}</span>
                    </li>
                  )}
                  <li className={styles.item} data-kind={e.kind} data-slug={e.slug} data-active={activeSlug === e.slug || undefined}>
                    <span className={`${styles.date} code`}>{e.date ?? '—'}</span>
                    <span className={styles.node} data-current={e.current || undefined} aria-hidden="true" />
                    <button type="button" className={styles.card} onClick={() => onOpen(e.slug)}>
                      <span className={styles.kind}>
                        {e.season ?? kindLabel[e.kind]}
                        {e.current && <span className={styles.live}>Em andamento</span>}
                      </span>
                      <span className={styles.title}>{e.name}</span>
                      {e.summary && <span className={styles.summary}>{e.summary}</span>}
                      {e.timeskip && <span className={styles.timeskip}>{e.timeskip}</span>}
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>
        <button type="button" className={styles.arrow} data-dir="next" onClick={() => scrollBy(1)} disabled={edges.end} aria-label="Próximos eventos">
          ›
        </button>
      </div>
    </section>
  );
}
