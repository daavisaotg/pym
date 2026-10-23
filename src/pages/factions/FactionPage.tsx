import type { CSSProperties, ReactNode } from 'react';
import { recordPath } from '@/app/paths';
import { characterTitle, useCollection, useRecordLinks } from '@/data';
import { asset } from '@/lib/asset';
import { Link, useParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { RouteLoading } from '@/components/ui/RouteLoading';
import { InDevelopment } from '@/components/ui/InDevelopment';
import { FactionCrest } from '@/components/library/FactionCrest';
import { LoreBody } from '@/components/lore/LoreBody';
import styles from './Faction.module.css';

function Block({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={styles.block} data-wide={wide || undefined}>
      <h2 className={styles.blockTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Names({ items }: { items?: string[] }) {
  const links = useRecordLinks();
  if (!items?.length) return <p className={styles.none}>Nenhum registro.</p>;
  return (
    <ul className={styles.names}>
      {items.map((n) => {
        const l = links.get(n);
        return (
          <li key={n}>
            {l ? (
              <Link to={l.href} className={`${styles.name} ${styles.nameLink}`}>
                {l.label}
              </Link>
            ) : (
              <span className={styles.name}>{n}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function FactionPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: factions, loading } = useCollection('factions');
  const { data: characters } = useCollection('characters');
  const { data: earths } = useCollection('earths');
  const links = useRecordLinks();

  if (loading) return <RouteLoading />;
  const f = factions.find((x) => x.slug === slug);
  if (!f) {
    return (
      <>
        <Seo title="Facção não encontrada" />
        <InDevelopment code="FC" title="Facção não encontrada" description="Nenhuma organização com este endereço está no arquivo." requested={slug} />
      </>
    );
  }

  const index = factions.findIndex((x) => x.id === f.id);
  const members = characters.filter((c) => c.factions?.includes(f.id) || f.members?.includes(c.id));
  const earth = earths.find((e) => e.id === f.earth);
  const events = (f.events ?? []).map((id) => links.get(id)).filter((l): l is NonNullable<typeof l> => Boolean(l));
  const related = (f.related ?? []).map((id) => links.get(id)).filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <article className={styles.page} style={{ '--tone': f.color ?? '#8a0303' } as CSSProperties}>
      <Seo title={f.name} description={f.summary} />

      <header className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.crest}>
            <FactionCrest faction={f} />
          </div>
          <div className={styles.heroText}>
            <nav className={styles.crumbs} aria-label="Caminho">
              <Link to="/faccoes">Facções</Link>
              <span aria-hidden="true">/</span>
              <span className="code">FC-{String(index + 1).padStart(3, '0')}</span>
            </nav>
            <h1 className={styles.h1}>{f.name}</h1>
            {f.classification && <p className={styles.classification}>{f.classification}</p>}
            {f.motto && <p className={styles.motto}>“{f.motto}”</p>}
            <p className={styles.stamp}>Dossiê confidencial</p>
          </div>
        </div>
      </header>

      <div className={`container ${styles.grid}`}>
        <Block title="Descrição" wide>
          {f.body?.length ? <LoreBody blocks={f.body} /> : <p className={styles.lead}>{f.summary}</p>}
        </Block>

        {f.goals?.length ? (
          <Block title="Objetivos">
            <ol className={styles.goals}>
              {f.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ol>
          </Block>
        ) : null}

        <Block title="Liderança">
          <Names items={f.leaders} />
          {f.figures?.length ? (
            <>
              <h3 className={styles.sub}>Outras figuras</h3>
              <Names items={f.figures} />
            </>
          ) : null}
        </Block>

        <Block title="Bases">
          {f.bases?.length ? (
            <ul className={styles.list}>
              {f.bases.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>Localização desconhecida.</p>
          )}
          {earth && (
            <p className={styles.earth}>
              Atua na{' '}
              <Link to={recordPath.earths(earth.slug)}>
                {earth.name} <span className="code">{earth.code}</span>
              </Link>
            </p>
          )}
        </Block>

        <Block title="Relações">
          <h3 className={styles.sub}>Aliados</h3>
          <Names items={f.allies} />
          <h3 className={styles.sub}>Inimigos</h3>
          <Names items={f.enemies} />
        </Block>

        <Block title="Membros no Database" wide>
          {members.length ? (
            <ul className={styles.members}>
              {members.map((c) => (
                <li key={c.id}>
                  <Link to={recordPath.characters(c.slug)} className={styles.member}>
                    {c.image ? <img src={asset(c.image)} alt="" loading="lazy" /> : <span className={styles.noPhoto}>{c.name.charAt(0)}</span>}
                    <span>
                      <span className={styles.memberName}>{characterTitle(c)}</span>
                      {c.codename && <span className={styles.memberReal}>{c.name}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>Nenhum personagem do Database ligado a esta facção ainda.</p>
          )}
        </Block>

        {events.length > 0 && (
          <Block title="Eventos no arquivo" wide>
            <ul className={styles.links}>
              {events.map((l) => (
                <li key={l.id}>
                  <Link to={l.href} className={styles.linkCard}>
                    <span className={styles.linkKind}>{l.kind}</span>
                    <span className={styles.linkName}>{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {(f.facts?.length || related.length) ? (
          <Block title="Outras informações" wide>
            {f.facts?.length ? (
              <dl className={styles.facts}>
                {f.facts.map((x) => (
                  <div key={x.label}>
                    <dt>{x.label}</dt>
                    <dd>{x.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {related.length > 0 && (
              <ul className={styles.links}>
                {related.map((l) => (
                  <li key={l.id}>
                    <Link to={l.href} className={styles.linkCard}>
                      <span className={styles.linkKind}>{l.kind}</span>
                      <span className={styles.linkName}>{l.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Block>
        ) : null}
      </div>
    </article>
  );
}
