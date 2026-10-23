import { useMemo } from 'react';
import { recordPath } from '@/app/paths';
import { libraryCategories, useCollection, type LibraryCategory, type LibraryEntry } from '@/data';
import { asset, normalize } from '@/lib/asset';
import { Link, useSearchParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { Icon } from '@/components/ui/Icon';
import { Sigil } from '@/components/library/Sigil';
import { Mandala } from '@/components/library/Mandala';
import magic from '@/content/magic.json';
import styles from './Library.module.css';

function EntryCard({ e }: { e: LibraryEntry }) {
  return (
    <li>
      <Link to={recordPath.library(e.slug)} className={styles.card}>
        <span className={styles.cardArt}>
          {e.image ? <img src={asset(e.image)} alt="" loading="lazy" /> : <Sigil name={e.name} category={e.category} />}
        </span>
        <span className={styles.cardBody}>
          {e.group && <span className={styles.cardGroup}>{e.group}</span>}
          <span className={styles.cardTitle}>{e.name}</span>
          <span className={styles.cardText} data-pending={e.pending || undefined}>
            {e.summary ?? 'Verbete aguardando o texto oficial.'}
          </span>
        </span>
      </Link>
    </li>
  );
}

const recoveredBooks = magic.books.filter((b) => 'pages' in b && b.pages).length;

export default function LibraryPage() {
  const { data: entries, loading } = useCollection('library');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = (params.get('cat') ?? '') as LibraryCategory | '';

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const counts = useMemo(() => {
    const m = new Map<LibraryCategory, number>();
    for (const e of entries) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  }, [entries]);

  const tabs = libraryCategories.filter((c) => counts.get(c.id));

  const results = useMemo(() => {
    const nq = normalize(q);
    return entries.filter((e) => {
      if (cat && e.category !== cat) return false;
      if (nq && !normalize([e.name, e.group, e.summary].filter(Boolean).join(' ')).includes(nq)) return false;
      return true;
    });
  }, [entries, q, cat]);

  // Agrupa por categoria, na ordem das abas
  const grouped = tabs
    .map((c) => ({ cat: c, items: results.filter((e) => e.category === c.id) }))
    .filter((g) => g.items.length);

  return (
    <div className={styles.page}>
      <Seo title="Biblioteca" description="Wiki oficial do PYM: artefatos, raças, pactos, tropas galácticas, simbiontes e a ala mística de Kamar-Taj." />

      <div className="container">
        <header className={styles.header}>
          <div>
            <p className={`${styles.kicker} code`}>MÓDULO BL</p>
            <h1 className={styles.h1}>Biblioteca</h1>
            <p className={styles.intro}>
              {loading ? 'Carregando verbetes…' : `${entries.length} verbetes catalogados.`} Artefatos, raças, pactos, tropas e
              simbiontes do universo PYM.
            </p>
          </div>
          <label className={styles.search}>
            <Icon name="search" size={18} />
            <span className="visually-hidden">Buscar na Biblioteca</span>
            <input id="bl-busca" type="search" value={q} onChange={(e) => update('q', e.target.value)} placeholder="Buscar verbete" autoComplete="off" />
          </label>
        </header>

        <Link to="/biblioteca/kamar-taj" className={styles.wing}>
          <span className={styles.wingArt}>
            <Mandala />
          </span>
          <span className={styles.wingText}>
            <span className={`${styles.wingKicker} code`}>ALA MÍSTICA</span>
            <span className={styles.wingTitle}>Biblioteca de Kamar-Taj</span>
            <span className={styles.wingDesc}>
              O acervo de magia Eldritch, as regras do Núcleo de Mana e os tomos recuperados depois da raid. {recoveredBooks}{' '}
              livros podem ser folheados.
            </span>
            <span className={styles.wingCta}>
              Entrar na ala <Icon name="arrow-up-right" size={16} />
            </span>
          </span>
        </Link>

        <div className={styles.tabs} role="radiogroup" aria-label="Categorias">
          <button type="button" role="radio" aria-checked={!cat} className={styles.tab} onClick={() => update('cat', '')}>
            Tudo <span className="code">{entries.length}</span>
          </button>
          {tabs.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={cat === c.id}
              className={styles.tab}
              onClick={() => update('cat', cat === c.id ? '' : c.id)}
            >
              {c.label} <span className="code">{counts.get(c.id)}</span>
            </button>
          ))}
        </div>

        {!loading && grouped.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum verbete encontrado.</p>
            <p>Confira a grafia ou procure em todas as categorias.</p>
            <button type="button" className={styles.clear} onClick={() => setParams(new URLSearchParams())}>
              Limpar busca
            </button>
          </div>
        )}

        {grouped.map(({ cat: c, items }) => (
          <section key={c.id} className={styles.group} aria-labelledby={`cat-${c.id}`}>
            <header className={styles.groupHead}>
              <h2 id={`cat-${c.id}`} className={styles.h2}>
                {c.label}
              </h2>
              <p className={styles.groupText}>{c.text}</p>
            </header>
            <ul className={styles.grid}>
              {items.map((e) => (
                <EntryCard key={e.id} e={e} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
