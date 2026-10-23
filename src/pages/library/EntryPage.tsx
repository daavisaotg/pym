import { recordPath } from '@/app/paths';
import { categoryInfo, useCollection, useRecordLinks } from '@/data';
import { asset } from '@/lib/asset';
import { Link, useParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { RouteLoading } from '@/components/ui/RouteLoading';
import { InDevelopment } from '@/components/ui/InDevelopment';
import { Sigil } from '@/components/library/Sigil';
import { LoreBody } from '@/components/lore/LoreBody';
import styles from './Entry.module.css';

export default function EntryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entries, loading } = useCollection('library');
  const links = useRecordLinks();

  if (loading) return <RouteLoading />;

  const entry = entries.find((e) => e.slug === slug);
  if (!entry) {
    return (
      <>
        <Seo title="Verbete não encontrado" />
        <InDevelopment
          code="BL"
          title="Verbete não encontrado"
          description="Nenhum verbete com este endereço está catalogado na Biblioteca."
          requested={slug}
        />
      </>
    );
  }

  const cat = categoryInfo(entry.category);
  const siblings = entries.filter((e) => e.category === entry.category);
  const i = siblings.findIndex((e) => e.id === entry.id);
  const prev = siblings[i - 1];
  const next = siblings[i + 1];
  const related = (entry.related ?? []).map((id) => links.get(id)).filter((l): l is NonNullable<typeof l> => Boolean(l));

  return (
    <article className={styles.page}>
      <Seo title={entry.name} description={entry.summary ?? `${cat.label} da Biblioteca do PYM.`} />

      <div className={`container ${styles.wrap}`}>
        <nav className={styles.crumbs} aria-label="Caminho">
          <Link to="/biblioteca">Biblioteca</Link>
          <span aria-hidden="true">/</span>
          <Link to={`/biblioteca?cat=${encodeURIComponent(entry.category)}`}>{cat.label}</Link>
        </nav>

        <div className={styles.layout}>
          <figure className={styles.art}>
            {entry.image ? (
              <img src={asset(entry.image)} alt={entry.name} />
            ) : (
              <div className={styles.sigil}>
                <Sigil name={entry.name} category={entry.category} />
              </div>
            )}
            <figcaption className={`${styles.caption} code`}>
              BL · {entry.category.toUpperCase()} · {String(i + 1).padStart(2, '0')}
            </figcaption>
          </figure>

          <div className={styles.text}>
            <p className={styles.category}>{entry.group ?? cat.label}</p>
            <h1 className={styles.title}>{entry.name}</h1>

            {entry.summary ? (
              <p className={styles.lede}>{entry.summary}</p>
            ) : (
              <p className={styles.pending}>Este verbete ainda aguarda o texto oficial da staff.</p>
            )}

            {entry.body?.length ? <LoreBody blocks={entry.body} /> : null}

            {entry.facts?.length ? (
              <dl className={styles.facts}>
                {entry.facts.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {related.length > 0 && (
              <section className={styles.related}>
                <h2 className={styles.relatedTitle}>Ligações no arquivo</h2>
                <ul>
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link to={r.href} className={styles.relatedLink}>
                        <span className={styles.relatedKind}>{r.kind}</span>
                        <span className={styles.relatedName}>{r.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <nav className={styles.pager} aria-label={`Outros verbetes de ${cat.label}`}>
          {prev ? (
            <Link to={recordPath.library(prev.slug)}>
              <span className={styles.pagerDir}>Anterior</span>
              <span className={styles.pagerName}>{prev.name}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={recordPath.library(next.slug)} data-next>
              <span className={styles.pagerDir}>Próximo</span>
              <span className={styles.pagerName}>{next.name}</span>
            </Link>
          )}
        </nav>
      </div>
    </article>
  );
}
