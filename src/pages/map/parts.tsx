import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { asset } from '@/lib/asset';
import { useRecordLinks } from '@/data';
import type { Fact } from '@/data/city';
import type { NameOrRef } from '@/data/types';
import { Link } from '@/router/router';
import { Icon } from '@/components/ui/Icon';
import panel from '../multiverse/Panel.module.css';
import styles from './MapPanel.module.css';

/** Fotos do local; um toque abre em tela cheia. */
export function Gallery({ images, alt }: { images?: string[]; alt: string }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(null);
      }
      if (e.key === 'ArrowRight') setOpen((i) => (i === null ? i : (i + 1) % images!.length));
      if (e.key === 'ArrowLeft') setOpen((i) => (i === null ? i : (i - 1 + images!.length) % images!.length));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, images]);

  if (!images?.length) return null;
  return (
    <>
      <ul className={styles.gallery} data-count={Math.min(images.length, 3)}>
        {images.map((src, i) => (
          <li key={src}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Ampliar foto ${i + 1} de ${alt}`}>
              <img src={asset(src)} alt="" loading="lazy" decoding="async" />
              <span className={`${styles.photoNo} code`}>FOTO {String(i + 1).padStart(2, '0')}</span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null &&
        createPortal(
          <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`Foto de ${alt}`} onClick={() => setOpen(null)}>
            <img src={asset(images[open])} alt={alt} onClick={(e) => e.stopPropagation()} />
            <span className={`${styles.lightboxCaption} code`}>
              {alt} · FOTO {open + 1}/{images.length}
            </span>
            <button type="button" className={styles.lightboxClose} onClick={() => setOpen(null)} aria-label="Fechar foto">
              <Icon name="close" size={20} />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Facts({ facts }: { facts?: Fact[] }) {
  if (!facts?.length) return null;
  return (
    <dl className={panel.facts}>
      {facts.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Registros do arquivo ligados ao local (personagens, eventos, facções, verbetes). */
export function Related({ items, title = 'Registros ligados' }: { items?: NameOrRef[]; title?: string }) {
  const links = useRecordLinks();
  if (!items?.length) return null;
  return (
    <Block title={title}>
      <ul className={styles.related}>
        {items.map((id) => {
          const l = links.get(id);
          return (
            <li key={id}>
              {l ? (
                <Link to={l.href} className={styles.relatedLink}>
                  <span className={styles.relatedKind}>{l.kind}</span>
                  <span className={styles.relatedName}>{l.label}</span>
                </Link>
              ) : (
                <span className={styles.relatedLink} data-plain>
                  <span className={styles.relatedName}>{id}</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

/** Nome que pode ser um registro do arquivo (vira link) ou texto livre. */
export function NameOrLink({ value }: { value: NameOrRef }) {
  const links = useRecordLinks();
  const l = links.get(value);
  return l ? (
    <Link to={l.href} className={panel.mapLink}>
      {l.label}
    </Link>
  ) : (
    <>{value}</>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={panel.section}>
      <h3 className={panel.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}
