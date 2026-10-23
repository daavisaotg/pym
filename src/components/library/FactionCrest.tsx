import type { CSSProperties } from 'react';
import type { Faction } from '@/data/types';
import { asset } from '@/lib/asset';
import styles from './FactionCrest.module.css';

/**
 * Brasão da facção. Usa o `logo` enviado pela staff quando existir;
 * sem ele, desenha um escudo genérico com a sigla, na cor da facção.
 */
export function FactionCrest({ faction, className }: { faction: Faction; className?: string }) {
  if (faction.logo) {
    return <img className={[styles.logo, className].filter(Boolean).join(' ')} src={asset(faction.logo)} alt={`Logo: ${faction.name}`} />;
  }
  const text = (faction.acronym ?? faction.name).toUpperCase();
  const size = text.length > 5 ? 22 : text.length > 4 ? 25 : 30;
  return (
    <svg
      className={[styles.crest, className].filter(Boolean).join(' ')}
      viewBox="0 0 120 140"
      style={{ '--crest': faction.color ?? '#8a0303' } as CSSProperties}
      role="img"
      aria-label={`Brasão: ${faction.name}`}
    >
      <path className={styles.outer} d="M60 4 L112 22 V70 C112 104 88 124 60 136 C32 124 8 104 8 70 V22 Z" />
      <path className={styles.inner} d="M60 14 L102 29 V70 C102 98 82 115 60 125 C38 115 18 98 18 70 V29 Z" />
      <path className={styles.chevron} d="M24 88 L60 106 L96 88" />
      <path className={styles.chevron} d="M30 98 L60 113 L90 98" />
      <line className={styles.rule} x1="26" y1="46" x2="94" y2="46" />
      <text className={styles.text} x="60" y="74" textAnchor="middle" style={{ fontSize: size }}>
        {text}
      </text>
      <circle className={styles.star} cx="60" cy="32" r="3.2" />
    </svg>
  );
}
