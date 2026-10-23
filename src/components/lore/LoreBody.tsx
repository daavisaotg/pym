import type { LoreBlock } from '@/data/types';
import styles from './LoreBody.module.css';

/** Texto de lore: parágrafos, intertítulos e falas. */
export function LoreBody({ blocks }: { blocks?: LoreBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <div className={styles.lore}>
      {blocks.map((b, i) => {
        if (typeof b === 'string') return <p key={i}>{b}</p>;
        if ('heading' in b)
          return (
            <h4 key={i} className={styles.heading}>
              {b.heading}
            </h4>
          );
        return (
          <blockquote key={i} className={styles.speech}>
            <span className={styles.speaker}>{b.speaker}</span>
            <p>{b.text}</p>
          </blockquote>
        );
      })}
    </div>
  );
}
