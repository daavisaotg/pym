import type { Trait } from '@/data/types';
import styles from './TraitList.module.css';

/** Lista de poderes ou habilidades com até três níveis de sub-itens. */
export function TraitList({ items, depth = 0 }: { items: Trait[]; depth?: number }) {
  return (
    <ul className={styles.list} data-depth={depth}>
      {items.map((t) => (
        <li key={t.name} className={styles.item}>
          <span className={styles.name}>{t.name}</span>
          {t.details && t.details.length > 0 && <TraitList items={t.details} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}
