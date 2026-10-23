import type { ReactNode } from 'react';
import { useRecordLinks, type Character } from '@/data';
import { Link } from '@/router/router';
import styles from './Panel.module.css';

export { LoreBody } from '@/components/lore/LoreBody';

/** Lista de nomes: ids de registros do arquivo (personagens, facções, verbetes) viram links, o resto é texto. */
export function NameList({ items }: { items?: string[]; characters?: Map<string, Character> }) {
  const links = useRecordLinks();
  if (!items?.length) return <p className={styles.none}>Nenhum registro.</p>;
  return (
    <ul className={styles.names}>
      {items.map((n) => {
        const l = links.get(n);
        return (
          <li key={n}>
            {l ? (
              <Link to={l.href} className={`${styles.name} ${styles.nameLink}`}>
                {l.label}
              </Link>
            ) : (
              <span className={styles.name}>{n}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </section>
  );
}
