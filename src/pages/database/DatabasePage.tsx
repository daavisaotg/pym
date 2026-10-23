import { useMemo } from 'react';
import { recordPath } from '@/app/paths';
import {
  alignmentLabel,
  characterOrganizations,
  characterTitle,
  statusLabel,
  useCollection,
  type Alignment,
  type Character,
  type RecordStatus,
} from '@/data';
import { asset, normalize } from '@/lib/asset';
import { Link, useSearchParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { Icon } from '@/components/ui/Icon';
import { StatusScale } from './StatusScale';
import { sortCharacters } from './sort';
import styles from './Database.module.css';

const ALIGNMENTS: Alignment[] = ['herói', 'vilão', 'anti-herói', 'neutro'];

function CharacterCard({ c, earthCode }: { c: Character; earthCode?: string }) {
  const title = characterTitle(c);
  return (
    <li>
      <Link to={recordPath.characters(c.slug)} className={styles.card}>
        <span className={styles.cardPhoto}>
          {c.image ? (
            <img src={asset(c.image)} alt="" width={480} height={600} loading="lazy" />
          ) : (
            <span className={styles.cardNoPhoto}>Sem foto</span>
          )}
          <span className={`${styles.cardCode} code`}>{c.code ?? 'DB'}</span>
        </span>
        <span className={styles.cardBody}>
          <span className={styles.cardTitle}>{title}</span>
          {title !== c.name && <span className={styles.cardName}>{c.name}</span>}
          <span className={styles.cardMeta}>
            <span data-alignment={c.alignment}>{alignmentLabel[c.alignment]}</span>
            <span>{earthCode ?? c.earth}</span>
            {c.status !== 'ativo' && <span>{statusLabel[c.status]}</span>}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default function DatabasePage() {
  const { data: characters, loading } = useCollection('characters');
  const { data: earths } = useCollection('earths');
  const { data: factions } = useCollection('factions');
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const lado = params.get('lado') ?? '';
  const terra = params.get('terra') ?? '';
  const org = params.get('org') ?? '';
  const status = params.get('status') ?? '';

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const factionNames = useMemo(() => new Map(factions.map((f) => [f.id, f.name])), [factions]);
  const earthCode = useMemo(() => new Map(earths.map((e) => [e.id, e.code])), [earths]);

  const orgsOf = useMemo(
    () => new Map(characters.map((c) => [c.id, characterOrganizations(c, factionNames)])),
    [characters, factionNames],
  );
  const orgOptions = useMemo(
    () => [...new Set([...orgsOf.values()].flat())].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [orgsOf],
  );
  const statusOptions = useMemo(() => [...new Set(characters.map((c) => c.status))] as RecordStatus[], [characters]);

  const results = useMemo(() => {
    const nq = normalize(q);
    return sortCharacters(characters).filter((c) => {
      if (lado && c.alignment !== lado) return false;
      if (terra && c.earth !== terra) return false;
      if (status && c.status !== status) return false;
      if (org && !orgsOf.get(c.id)?.includes(org)) return false;
      if (nq) {
        const hay = normalize([c.name, c.codename, c.identity, ...(c.aliases ?? []), c.race].filter(Boolean).join(' '));
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
  }, [characters, q, lado, terra, status, org, orgsOf]);

  const filtered = Boolean(q || lado || terra || org || status);

  return (
    <div className={styles.page}>
      <Seo title="Database" description="Fichas de todos os personagens registrados no Multiverso PYM." />

      <div className="container">
        <header className={styles.header}>
          <div className={styles.headText}>
            <p className={`${styles.kicker} code`}>MÓDULO DB</p>
            <h1 className={styles.h1}>Database</h1>
            <p className={styles.intro}>
              {loading ? 'Carregando registros…' : `${characters.length} ${characters.length === 1 ? 'personagem registrado' : 'personagens registrados'} no arquivo.`}{' '}
              Abra uma ficha para ver status, poderes, relações e história.
            </p>
          </div>

          <label className={styles.searchField}>
            <Icon name="search" size={18} />
            <span className="visually-hidden">Buscar por nome</span>
            <input
              id="db-busca"
              type="search"
              value={q}
              onChange={(e) => update('q', e.target.value)}
              placeholder="Nome, codinome ou apelido"
              autoComplete="off"
            />
          </label>
        </header>

        <div className={styles.filters} role="group" aria-label="Filtros">
          <div className={styles.chips} role="radiogroup" aria-label="Lado">
            <button type="button" role="radio" aria-checked={!lado} className={styles.chip} onClick={() => update('lado', '')}>
              Todos
            </button>
            {ALIGNMENTS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={lado === a}
                className={styles.chip}
                data-alignment={a}
                onClick={() => update('lado', lado === a ? '' : a)}
              >
                {alignmentLabel[a]}
              </button>
            ))}
          </div>

          <div className={styles.selects}>
            <label className={styles.select}>
              <span>Terra</span>
              <select id="db-terra" value={terra} onChange={(e) => update('terra', e.target.value)}>
                <option value="">Todas</option>
                {earths.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.select}>
              <span>Organização</span>
              <select id="db-org" value={org} onChange={(e) => update('org', e.target.value)}>
                <option value="">Todas</option>
                {orgOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.select}>
              <span>Status</span>
              <select id="db-status" value={status} onChange={(e) => update('status', e.target.value)}>
                <option value="">Todos</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className={styles.resultBar}>
          <span>
            {filtered
              ? `${results.length} de ${characters.length} ${characters.length === 1 ? 'registro' : 'registros'}`
              : `${characters.length} ${characters.length === 1 ? 'registro' : 'registros'}`}
          </span>
          {filtered && (
            <button type="button" className={styles.clear} onClick={() => setParams(new URLSearchParams())}>
              Limpar filtros
            </button>
          )}
        </div>

        {!loading && results.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum personagem com esses filtros.</p>
            <p>Remova um filtro ou procure por outro nome.</p>
            <button type="button" className={styles.clear} onClick={() => setParams(new URLSearchParams())}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <ul className={styles.grid}>
            {results.map((c) => (
              <CharacterCard key={c.id} c={c} earthCode={earthCode.get(c.earth)} />
            ))}
          </ul>
        )}

        <StatusScale />
      </div>
    </div>
  );
}
