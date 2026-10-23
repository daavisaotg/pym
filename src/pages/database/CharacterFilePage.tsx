import { useEffect, useMemo, type ReactNode } from 'react';
import { recordPath } from '@/app/paths';
import {
  alignmentLabel,
  characterOrganizations,
  characterTitle,
  statusLabel,
  useCollection,
  type Character,
  type Earth,
} from '@/data';
import { asset } from '@/lib/asset';
import { Link, useNavigate, useParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { RouteLoading } from '@/components/ui/RouteLoading';
import { InDevelopment } from '@/components/ui/InDevelopment';
import { ScrambleText } from '@/components/dossier/ScrambleText';
import { Seal } from '@/components/dossier/Seal';
import { StatusPanel } from '@/components/dossier/StatusPanel';
import { TraitList } from '@/components/dossier/TraitList';
import { sortCharacters } from './sort';
import styles from './CharacterFile.module.css';

function Panel({ title, children, wide, index = 0 }: { title: string; children: ReactNode; wide?: boolean; index?: number }) {
  return (
    <section className={styles.panel} data-wide={wide || undefined} style={{ animationDelay: `${260 + index * 70}ms` }}>
      <h2 className={styles.panelHead}>{title}</h2>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className={styles.none}>{children}</p>;
}

export default function CharacterFilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: characters, loading } = useCollection('characters');
  const { data: earths } = useCollection('earths');
  const { data: factions } = useCollection('factions');

  const ordered = useMemo(() => sortCharacters(characters), [characters]);
  const index = ordered.findIndex((c) => c.slug === slug);
  const character = ordered[index];

  if (loading) return <RouteLoading />;

  if (!character) {
    return (
      <>
        <Seo title="Registro não encontrado" />
        <InDevelopment
          code="DB"
          title="Registro não encontrado"
          description="Nenhum personagem com este endereço está catalogado no Database."
          requested={slug}
        />
      </>
    );
  }

  const prev = ordered[(index - 1 + ordered.length) % ordered.length];
  const next = ordered[(index + 1) % ordered.length];

  return (
    <CharacterFile
      key={character.id}
      character={character}
      earth={earths.find((e) => e.id === character.earth)}
      organizations={characterOrganizations(character, new Map(factions.map((f) => [f.id, f.name])))}
      prev={ordered.length > 1 ? prev : undefined}
      next={ordered.length > 1 ? next : undefined}
      position={index + 1}
      total={ordered.length}
    />
  );
}

interface FileProps {
  character: Character;
  earth?: Earth;
  organizations: string[];
  prev?: Character;
  next?: Character;
  position: number;
  total: number;
}

function CharacterFile({ character: c, earth, organizations, prev, next, position, total }: FileProps) {
  const navigate = useNavigate();
  const title = characterTitle(c);

  // ← → trocam de ficha; Esc volta à lista (fora de campos de texto e da busca).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || document.documentElement.dataset.scrollLock !== undefined) return;
      if (e.key === 'ArrowLeft' && prev) navigate(recordPath.characters(prev.slug));
      else if (e.key === 'ArrowRight' && next) navigate(recordPath.characters(next.slug));
      else if (e.key === 'Escape') navigate('/database');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, navigate]);

  const identification: [string, ReactNode][] = [
    ['Nome', c.name],
    ...(c.identity ? [['Identidade civil', c.identity] as [string, ReactNode]] : []),
    ['Lado', [alignmentLabel[c.alignment], c.alignmentNote].filter(Boolean).join('. ')],
    ['Status', statusLabel[c.status]],
    ['Terra', earth ? <Link to={recordPath.earths(earth.slug)}>{earth.name}</Link> : c.earth],
    ['Raça', c.race ?? 'Não informada'],
    ['Idade', c.age ?? '—'],
    ['Altura', c.height ?? '—'],
    ['Peso', c.weight ?? '—'],
    ['Gênero', c.gender ?? '—'],
    ['Sexualidade', c.sexuality ?? '—'],
    ...(organizations.length ? [['Organizações', organizations.join(', ')] as [string, ReactNode]] : []),
    ...(c.player ? [['Jogador', c.player] as [string, ReactNode]] : []),
  ];

  let panel = 0;

  return (
    <article className={styles.page}>
      <Seo title={title} description={c.summary ?? c.description} />

      <div className={`container ${styles.wrap}`}>
        <div className={styles.screen}>
          {/* Barra superior: navegação como na tela da NSA */}
          <header className={styles.topbar}>
            <div className={styles.controls}>
              <Link to="/database" className={styles.ctrl} aria-label="Voltar ao Database" title="Voltar ao Database (Esc)">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </Link>
              {prev && (
                <Link to={recordPath.characters(prev.slug)} className={styles.ctrl} aria-label={`Ficha anterior: ${characterTitle(prev)}`} title="Anterior (←)">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M16 4 6 12l10 8z" fill="currentColor" />
                  </svg>
                </Link>
              )}
              {next && (
                <Link to={recordPath.characters(next.slug)} className={styles.ctrl} aria-label={`Próxima ficha: ${characterTitle(next)}`} title="Próxima (→)">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M8 4l10 8-10 8z" fill="currentColor" />
                  </svg>
                </Link>
              )}
            </div>
            <h1 className={styles.title}>
              <ScrambleText text={title.toUpperCase()} />
            </h1>
            <span className={`${styles.counter} code`}>
              {c.code ?? 'DB'} · {position}/{total}
            </span>
          </header>

          {/* Cabeçalho: selo, status e foto */}
          <div className={styles.head}>
            <div className={styles.sealCol}>
              <Seal size={116} />
            </div>

            <div className={styles.statsCol}>
              <div className={styles.names}>
                {c.codename && <span className={styles.realName}>{c.name}</span>}
                {c.aliases && c.aliases.length > 0 && (
                  <span className={styles.aliases}>Também conhecido como {c.aliases.join(', ')}</span>
                )}
                <span className={styles.badges}>
                  <span className={styles.badge} data-alignment={c.alignment}>
                    {alignmentLabel[c.alignment]}
                  </span>
                  <span className={styles.badge}>{earth?.code ?? c.earth}</span>
                  <span className={styles.badge} data-status={c.status}>
                    {statusLabel[c.status]}
                  </span>
                </span>
              </div>
              <StatusPanel stats={c.stats ?? []} delay={350} />
            </div>

            <figure className={styles.photo}>
              {c.image ? (
                <img src={asset(c.image)} alt={`Foto de registro de ${title}`} width={480} height={600} />
              ) : (
                <div className={styles.noPhoto}>Sem foto de registro</div>
              )}
              <span className={styles.scan} aria-hidden="true" />
              <figcaption className={`${styles.photoCaption} code`}>FOTO DE REGISTRO</figcaption>
            </figure>
          </div>

          {/* Painéis */}
          <div className={styles.grid}>
            <Panel title="Identificação" wide index={panel++}>
              <dl className={styles.facts}>
                {identification.map(([k, v]) => (
                  <div key={k} className={styles.fact}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            <Panel title="Poderes" index={panel++}>
              {c.powers?.length ? <TraitList items={c.powers} /> : <Empty>Nenhum poder registrado.</Empty>}
            </Panel>

            <Panel title="Habilidades" index={panel++}>
              {c.abilities?.length ? <TraitList items={c.abilities} /> : <Empty>Nenhuma habilidade registrada.</Empty>}
            </Panel>

            <Panel title="Fraquezas" index={panel++}>
              {c.weaknesses?.length ? <TraitList items={c.weaknesses.map((name) => ({ name }))} /> : <Empty>Nenhuma fraqueza registrada.</Empty>}
            </Panel>

            <Panel title="Relações" index={panel++}>
              {c.relations?.length ? (
                <ul className={styles.relations}>
                  {c.relations.map((r) => (
                    <li key={r.name} className={styles.relation}>
                      <span className={styles.relationName}>{r.name}</span>
                      <span className={styles.relationMeta}>{[r.kind === 'organização' ? 'Organização' : r.kind === 'pessoa' ? 'Pessoa' : '', r.role].filter(Boolean).join(': ')}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Nenhuma relação registrada.</Empty>
              )}
              <div className={styles.rivals}>
                <h3 className={styles.subhead}>Rival</h3>
                {c.rivals?.length ? c.rivals.map((r) => <p key={r}>{r}</p>) : <Empty>Nenhum rival declarado.</Empty>}
              </div>
            </Panel>

            {c.description && (
              <Panel title="Descrição" wide index={panel++}>
                <p className={styles.prose}>{c.description}</p>
              </Panel>
            )}

            {c.history && (
              <Panel title="História" wide index={panel++}>
                <p className={`${styles.prose} ${styles.letter}`}>{c.history}</p>
              </Panel>
            )}

            <Panel title="Fama" wide index={panel++}>
              {c.fame?.length ? (
                <ul className={styles.fame}>
                  {c.fame.map((f, i) => (
                    <li key={i} className={styles.fameRow}>
                      <span className={styles.fameWhere}>
                        {f.place}
                        {f.as && <span className={styles.fameAs}>como {f.as}</span>}
                      </span>
                      <span className={styles.fameMeter} aria-hidden="true">
                        {Array.from({ length: 10 }, (_, k) => (
                          <span key={k} data-on={k < f.score || undefined} />
                        ))}
                      </span>
                      <span className={`${styles.fameScore} code`}>
                        {f.score}/10
                      </span>
                      {f.note && <span className={styles.fameNote}>{f.note}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Fama não avaliada.</Empty>
              )}
            </Panel>

            {c.gallery && c.gallery.length > 0 && (
              <Panel title="Arquivo de imagens" wide index={panel++}>
                <div className={styles.gallery}>
                  {c.gallery.map((g) => (
                    <figure key={g.src} className={styles.galleryItem}>
                      <img src={asset(g.src)} alt={g.caption ?? title} loading="lazy" />
                      {g.caption && <figcaption>{g.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          <footer className={styles.footer}>
            <span>Confidencial</span>
            <span className={styles.footerHint}>← → trocam de ficha · Esc volta à lista</span>
            <span>Arquivo do Multiverso PYM</span>
          </footer>
        </div>
      </div>
    </article>
  );
}
