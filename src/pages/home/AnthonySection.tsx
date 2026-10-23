import { asset } from '@/lib/asset';
import site from '@/content/site.json';
import styles from './Sections.module.css';

export function AnthonySection() {
  return (
    <section id="anthony" className={`container ${styles.section} ${styles.anthony}`} aria-labelledby="anthony-titulo">
      <div className={styles.antFigure}>
        <img src={asset('brand/anthony.png')} alt="Anthony, a formiga símbolo do PYM" width={668} height={751} loading="lazy" />
      </div>

      <div className={styles.antText}>
        <h2 id="anthony-titulo" className={styles.h2}>
          {site.anthony.name}
        </h2>
        {site.anthony.paragraphs.map((p, i) => (
          <p key={i} className={styles.paragraph}>
            {p}
          </p>
        ))}
        <p className={styles.closing}>{site.anthony.closing}</p>
      </div>
    </section>
  );
}
