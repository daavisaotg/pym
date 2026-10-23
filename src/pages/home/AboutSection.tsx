import { useEffect, useState } from 'react';
import { useCollection } from '@/data';
import site from '@/content/site.json';
import styles from './Sections.module.css';

/** Acompanha qual capítulo do guia está na tela para destacar no índice. */
function useActiveChapter(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const chapterIds = site.about.map((c) => c.id);

export function AboutSection() {
  const { data: earths } = useCollection('earths');
  const { data: characters } = useCollection('characters');
  const active = useActiveChapter(chapterIds);
  const years = new Date().getFullYear() - site.foundedYear;

  const record: [string, string][] = [
    ['Gênero', site.genre],
    ['Plataforma', site.platform],
    ['Fundação', String(site.foundedYear)],
    ['Em atividade', years > 0 ? `há ${years} ${years === 1 ? 'ano' : 'anos'}` : 'desde este ano'],
    ['Universos', 'Marvel, DC Comics e originais'],
    ['Terras registradas', earths.length ? String(earths.length) : '…'],
    ['Personagens no Database', characters.length ? String(characters.length) : '…'],
  ];

  return (
    <section id="sobre" className={`container ${styles.section} ${styles.about}`} aria-labelledby="sobre-titulo">
      <aside className={styles.aside}>
        <div className={styles.record}>
          <div className={styles.recordHead}>
            <span>Ficha da comunidade</span>
            <span className="code">PYM-0001</span>
          </div>
          <dl className={styles.recordList}>
            {record.map(([k, v]) => (
              <div key={k} className={styles.recordRow}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <nav className={styles.toc} aria-label="Capítulos do guia">
          {site.about.map((c, i) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className={styles.tocLink}
              aria-current={active === c.id ? 'true' : undefined}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="code">{String(i + 1).padStart(2, '0')}</span>
              {c.title}
            </a>
          ))}
        </nav>
      </aside>

      <div className={styles.doc}>
        <h2 id="sobre-titulo" className={styles.h2}>
          O que é o PYM
        </h2>
        <p className={styles.welcome}>{site.welcome}</p>

        {site.about.map((chapter, i) => (
          <article key={chapter.id} id={chapter.id} className={styles.chapter}>
            <h3 className={styles.h3}>
              <span className={`${styles.chapterNo} code`}>{String(i + 1).padStart(2, '0')}</span>
              {chapter.title}
            </h3>
            {chapter.paragraphs.map((p, j) => (
              <p key={j} className={styles.paragraph}>
                {p}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
