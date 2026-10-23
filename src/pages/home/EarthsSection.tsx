import { recordPath } from '@/app/paths';
import { useCollection } from '@/data';
import { Link } from '@/router/router';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import styles from './Sections.module.css';

/** Prévia do módulo Multiverso: as Terras registradas ligadas por uma linha de luz. */
export function EarthsSection() {
  const { data: earths, loading } = useCollection('earths');

  return (
    <section id="terras" className={`container ${styles.section}`} aria-labelledby="terras-titulo">
      <header className={styles.head}>
        <h2 id="terras-titulo" className={styles.h2}>
          Terras registradas
        </h2>
        <p className={styles.intro}>
          Cada Terra terá ficha própria, linha do tempo e mapa no módulo Multiverso. Hoje o arquivo cataloga{' '}
          {loading ? '…' : earths.length} {earths.length === 1 ? 'realidade' : 'realidades'}.
        </p>
      </header>

      <div className={styles.earths}>
        <svg className={styles.orbit} viewBox="0 0 600 220" role="img" aria-label="Conexão entre as Terras registradas">
          <defs>
            <radialGradient id="planet-a" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#e6d8bc" />
              <stop offset="0.35" stopColor="#b3201a" />
              <stop offset="1" stopColor="#2a0404" />
            </radialGradient>
            <radialGradient id="planet-b" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#fbf8f3" />
              <stop offset="0.4" stopColor="#9c8c70" />
              <stop offset="1" stopColor="#1d1712" />
            </radialGradient>
            <linearGradient id="link" x1="0" x2="1">
              <stop offset="0" stopColor="#c8261d" stopOpacity="0.9" />
              <stop offset="1" stopColor="#e6d8bc" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          <ellipse cx="300" cy="110" rx="250" ry="70" className={styles.ring} />
          <path d="M140 112 Q300 40 460 112" className={styles.linkGlow} filter="url(#glow)" />
          <path d="M140 112 Q300 40 460 112" className={styles.link} />

          <circle cx="140" cy="112" r="44" className={styles.halo} />
          <circle cx="140" cy="112" r="34" fill="url(#planet-a)" />
          <circle cx="460" cy="112" r="38" className={styles.halo} />
          <circle cx="460" cy="112" r="28" fill="url(#planet-b)" />

          <text x="140" y="180" className={styles.planetLabel} textAnchor="middle">
            {earths[0]?.code ?? 'TERRA-001'}
          </text>
          <text x="460" y="180" className={styles.planetLabel} textAnchor="middle">
            {earths[1]?.code ?? 'TERRA-ULTIMATE'}
          </text>
        </svg>

        <ul className={styles.earthList}>
          {earths.map((earth) => (
            <li key={earth.id}>
              <Link to={recordPath.earths(earth.slug)} className={styles.earthRow}>
                <span className={`${styles.earthCode} code`}>{earth.code}</span>
                <span className={styles.earthName}>{earth.name}</span>
                <span className={styles.earthMeta}>{earth.hasMap && earth.mapName ? `Mapa: ${earth.mapName}` : 'Mapa em desenvolvimento'}</span>
                <Icon name="arrow-up-right" size={18} className={styles.earthArrow} />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.headActions}>
        <Button to="/multiverso" variant="ghost">
          Abrir o Multiverso
        </Button>
      </div>
    </section>
  );
}
