import type { Character, Earth, TimelineEvent } from '@/data';
import { kindLabel } from './eventKinds';
import { LoreBody, NameList, Section } from './parts';
import styles from './Panel.module.css';

interface Props {
  event: TimelineEvent;
  events: TimelineEvent[];
  earths: Earth[];
  characters: Map<string, Character>;
  onOpenEvent: (slug: string) => void;
  onSelectEarth: (slug: string) => void;
}

export function EventPanel({ event: e, events, earths, characters, onOpenEvent, onSelectEarth }: Props) {
  const ordered = [...events].sort((a, b) => a.order - b.order);
  const i = ordered.findIndex((x) => x.id === e.id);
  const prev = ordered[i - 1];
  const next = ordered[i + 1];
  const involved = earths.filter((x) => e.earths?.includes(x.id));

  return (
    <>
      <header className={styles.head} data-kind={e.kind}>
        <p className={styles.eventMeta}>
          <span className={styles.kind} data-kind={e.kind}>
            {e.season ?? kindLabel[e.kind]}
          </span>
          {e.date && <span className="code">{e.date}</span>}
          {e.current && <span className={styles.live}>Em andamento</span>}
        </p>
        <h2 className={styles.title}>{e.name}</h2>
        {e.timeskip && <p className={styles.timeskip}>{e.timeskip}</p>}
        {e.tagline && <p className={styles.tagline}>{e.tagline}</p>}
      </header>

      {e.summary && <p className={styles.summary}>{e.summary}</p>}

      {e.milestones?.length ? (
        <Section title="Marcos">
          <ol className={styles.milestones}>
            {e.milestones.map((m, k) => (
              <li key={k}>
                {m.date && <span className="code">{m.date}</span>}
                <span>{m.label}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {involved.length > 0 && (
        <Section title="Terras envolvidas">
          <ul className={styles.connections}>
            {involved.map((x) => (
              <li key={x.id}>
                <button type="button" className={styles.connection} onClick={() => onSelectEarth(x.slug)}>
                  <span className="code">{x.code}</span>
                  <span className={styles.connectionName}>{x.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {e.characters?.length ? (
        <Section title="Envolvidos">
          <NameList items={e.characters} characters={characters} />
        </Section>
      ) : null}

      {e.body?.length ? (
        <Section title={e.kind === 'perdido' ? 'O que se sabe' : 'Lore'}>
          <LoreBody blocks={e.body} />
        </Section>
      ) : null}

      <nav className={styles.pager} aria-label="Outros eventos">
        {prev ? (
          <button type="button" onClick={() => onOpenEvent(prev.slug)}>
            <span className={styles.pagerDir}>Anterior</span>
            <span className={styles.pagerName}>{prev.name}</span>
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" onClick={() => onOpenEvent(next.slug)} data-next>
            <span className={styles.pagerDir}>Próximo</span>
            <span className={styles.pagerName}>{next.name}</span>
          </button>
        )}
      </nav>
    </>
  );
}
