import styles from './Mandala.module.css';

interface Props {
  /** "hero" gira devagar em camadas; "icon" é estático, para ícones de Mana. */
  variant?: 'hero' | 'icon';
  className?: string;
}

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

/** Mandala Eldritch de Kamar-Taj: anéis de runas, octograma e núcleo. */
export function Mandala({ variant = 'hero', className }: Props) {
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  return (
    <svg
      className={[styles.mandala, styles[variant], className].filter(Boolean).join(' ')}
      viewBox="0 0 200 200"
      aria-hidden="true"
    >
      <g className={styles.outer}>
        <circle cx="100" cy="100" r="96" className={styles.stroke} />
        <circle cx="100" cy="100" r="88" className={styles.thin} />
        {variant === 'hero' &&
          ticks.map((i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const r2 = i % 6 === 0 ? 82 : 85;
          return (
            <line
              key={i}
              x1={100 + 88 * Math.cos(a)}
              y1={100 + 88 * Math.sin(a)}
              x2={100 + r2 * Math.cos(a)}
              y2={100 + r2 * Math.sin(a)}
              className={styles.thin}
            />
          );
        })}
        {variant === 'hero' &&
          Array.from(RUNES).map((ch, i, arr) => {
            const a = (i / arr.length) * 360;
            return (
              <text key={i} x="100" y="15.5" className={styles.rune} transform={`rotate(${a} 100 100)`} textAnchor="middle">
                {ch}
              </text>
            );
          })}
      </g>

      <g className={styles.middle}>
        <rect x="45" y="45" width="110" height="110" className={styles.stroke} />
        <rect x="45" y="45" width="110" height="110" className={styles.stroke} transform="rotate(45 100 100)" />
        <circle cx="100" cy="100" r="62" className={styles.thin} />
      </g>

      <g className={styles.inner}>
        <circle cx="100" cy="100" r="40" className={styles.stroke} />
        <polygon points="100,62 133,119 67,119" className={styles.thin} />
        <polygon points="100,138 67,81 133,81" className={styles.thin} />
        <circle cx="100" cy="100" r="22" className={styles.thin} />
      </g>

      <circle cx="100" cy="100" r="9" className={styles.core} />
    </svg>
  );
}
