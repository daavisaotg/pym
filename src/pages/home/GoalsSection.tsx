import site from '@/content/site.json';
import styles from './Sections.module.css';

export function GoalsSection() {
  return (
    <section id="diretrizes" className={`container ${styles.section}`} aria-labelledby="diretrizes-titulo">
      <header className={styles.head}>
        <h2 id="diretrizes-titulo" className={styles.h2}>
          Diretrizes
        </h2>
        <p className={styles.intro}>O que orienta cada história contada no PYM.</p>
      </header>

      <ul className={styles.goals}>
        {site.goals.map((g) => (
          <li key={g.title} className={styles.goal}>
            <h3 className={styles.goalTitle}>{g.title}</h3>
            <p className={styles.goalText}>{g.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
