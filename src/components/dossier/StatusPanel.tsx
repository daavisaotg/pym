import { useState, type CSSProperties } from 'react';
import type { CharacterStat } from '@/data/types';
import { attributeLabel, attributeOrder, describeTier, maxLevel, tierInfo, tiers } from '@/data/status';
import { Link } from '@/router/router';
import styles from './StatusPanel.module.css';

interface Props {
  stats: CharacterStat[];
  /** Atraso (ms) antes de as barras começarem a encher. */
  delay?: number;
}

/**
 * Barras de status da ficha. Cada barra tem 9 segmentos, um por nível da
 * escala oficial; a cor muda por faixa (humano, super, mega).
 * Tocar ou passar o mouse num atributo mostra o que aquele nível significa.
 */
export function StatusPanel({ stats, delay = 0 }: Props) {
  const sorted = [...stats].sort((a, b) => attributeOrder(a.attribute) - attributeOrder(b.attribute));
  const [active, setActive] = useState(0);

  if (!sorted.length) {
    return (
      <div className={styles.empty}>
        <p>Status ainda não avaliados pela staff.</p>
        <Link to="/database#escala" className={styles.scaleLink}>
          Como funciona a escala
        </Link>
      </div>
    );
  }

  const current = sorted[Math.min(active, sorted.length - 1)];
  const currentTier = tierInfo(current.tier);

  return (
    <div className={styles.panel}>
      <ul className={styles.rows}>
        {sorted.map((s, i) => {
          const info = tierInfo(s.tier);
          const level = info?.level ?? 0;
          return (
            <li key={s.attribute}>
              <button
                type="button"
                className={styles.row}
                aria-pressed={i === active}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className={styles.label}>{attributeLabel(s.attribute)}</span>
                <span className={styles.bar} aria-hidden="true">
                  {tiers.map((t) => (
                    <span
                      key={t.id}
                      className={styles.seg}
                      data-group={t.group}
                      data-on={t.level <= level || undefined}
                      style={{ '--d': `${delay + i * 90 + t.level * 45}ms` } as CSSProperties}
                    />
                  ))}
                </span>
                <span className={styles.tier}>{info?.label ?? s.tier}</span>
                <span className="visually-hidden">
                  , nível {level} de {maxLevel}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={styles.inspector} aria-live="polite">
        <p className={styles.inspectorHead}>
          {attributeLabel(current.attribute)}: {currentTier?.label}
          {currentTier?.restricted && <span className={styles.restricted}>{currentTier.restricted}</span>}
        </p>
        <p className={styles.inspectorText}>
          {describeTier(current.attribute, current.tier)}
          {current.note && ` (${current.note})`}
        </p>
      </div>
    </div>
  );
}
