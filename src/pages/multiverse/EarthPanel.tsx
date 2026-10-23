import type { Character, Earth, TimelineEvent } from '@/data';
import { Link } from '@/router/router';
import { statusTone } from './MultiverseMap';
import { kindLabel } from './eventKinds';
import { NameList, Section } from './parts';
import styles from './Panel.module.css';

interface Props {
  earth: Earth;
  earths: Earth[];
  events: TimelineEvent[];
  characters: Map<string, Character>;
  onOpenEvent: (slug: string) => void;
  onSelectEarth: (slug: string) => void;
}

export function EarthPanel({ earth, earths, events, characters, onOpenEvent, onSelectEarth }: Props) {
  const own = events.filter((e) => e.earths?.includes(earth.id)).sort((a, b) => a.order - b.order);
  const byId = new Map(earths.map((e) => [e.id, e]));

  return (
    <>
      <header className={styles.head}>
        <p className={`${styles.code} code`}>{earth.code}</p>
        <h2 className={styles.title}>{earth.name}</h2>
        {earth.aliases?.length ? <p className={styles.aliases}>{earth.aliases.join(', ')}</p> : null}
        <p className={styles.status}>
          <span className={styles.statusDot} style={{ background: statusTone[earth.status] }} />
          <span className={styles.statusLabel}>{earth.status}</span>
          {earth.statusNote && <span className={styles.statusNote}>{earth.statusNote}</span>}
        </p>
      </header>

      {earth.lore?.length ? (
        <div className={styles.lore}>
          {earth.lore.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className={styles.none}>Lore ainda não registrada.</p>
      )}

      {earth.facts?.length ? (
        <dl className={styles.facts}>
          {earth.facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <Section title="Linha temporal">
        {own.length ? (
          <ol className={styles.minitimeline}>
            {own.map((e) => (
              <li key={e.id} data-kind={e.kind}>
                <button type="button" onClick={() => onOpenEvent(e.slug)} className={styles.miniEvent}>
                  <span className={`${styles.miniDate} code`}>{e.date ?? ''}</span>
                  <span className={styles.miniName}>{e.name}</span>
                  <span className={styles.miniKind}>{[e.season, kindLabel[e.kind]].filter(Boolean).join(', ')}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.none}>Nenhum evento registrado nesta Terra.</p>
        )}
      </Section>

      <Section title="Principais heróis">
        <NameList items={earth.heroes} characters={characters} />
      </Section>
      <Section title="Principais vilões">
        <NameList items={earth.villains} characters={characters} />
      </Section>
      <Section title="Organizações">
        <NameList items={earth.organizations} characters={characters} />
      </Section>

      {earth.connections?.length ? (
        <Section title="Conexões">
          <ul className={styles.connections}>
            {earth.connections.map((c) => {
              const other = byId.get(c.to);
              if (!other) return null;
              return (
                <li key={c.to}>
                  <button type="button" className={styles.connection} onClick={() => onSelectEarth(other.slug)}>
                    <span className="code">{other.code}</span>
                    <span className={styles.connectionName}>{other.name}</span>
                    {c.label && <span className={styles.connectionLabel}>{c.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      <Section title="Mapa">
        {earth.hasMap ? (
          <Link to="/mapa" className={styles.mapLink}>
            Abrir o mapa de {earth.mapName ?? earth.name}
          </Link>
        ) : (
          <p className={styles.devStamp}>IN DEVELOPMENT</p>
        )}
      </Section>
    </>
  );
}
