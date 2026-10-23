import { useState, type CSSProperties } from 'react';
import type { Book, MagicContent } from '@/data/magic';
import { Link, useSearchParams } from '@/router/router';
import { Seo } from '@/components/ui/Seo';
import { Mandala } from '@/components/library/Mandala';
import rawMagic from '@/content/magic.json';
import { BookReader } from './BookReader';
import { isRecovered, shelfLabel, shelfOrder } from './shelves';
import styles from './KamarTaj.module.css';

const magic = rawMagic as MagicContent;

/** Altura e largura da lombada variam por livro, sempre iguais para o mesmo título. */
function spineSize(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { height: 80 + (h % 20), width: 3.1 + ((h >> 5) % 10) / 10 };
}

function Spine({ book, onOpen }: { book: Book; onOpen: (b: Book) => void }) {
  const glow = isRecovered(book);
  const size = spineSize(book.id);
  return (
    <li className={styles.spineSlot}>
      <button
        type="button"
        className={styles.spine}
        data-glow={glow || undefined}
        style={{ '--spine': book.color ?? '#5c1410', '--h': `${size.height}%`, '--w': `${size.width}rem` } as CSSProperties}
        onClick={() => onOpen(book)}
        aria-label={`${book.title}, ${book.kind}. ${glow ? 'Páginas recuperadas: abrir livro.' : 'Conteúdo perdido na raid.'}`}
      >
        <span className={styles.spineBand} />
        <span className={styles.spineTitle}>{book.title}</span>
        <span className={styles.spineKind}>{book.kind}</span>
        <span className={styles.spineBand} />
      </button>
      <span className={styles.spineTip} aria-hidden="true">
        <strong>{book.title}</strong>
        <span>{book.kind}</span>
        <em>{glow ? 'Abrir e folhear' : 'Perdido na raid'}</em>
      </span>
    </li>
  );
}

type RulesTab = 'graus' | 'natural' | 'corrompida';

function Rules() {
  const [tab, setTab] = useState<RulesTab>('graus');
  const s = magic.system;
  return (
    <section id="nucleo" className={`container ${styles.section}`} aria-labelledby="nucleo-titulo">
      <header className={styles.head}>
        <h2 id="nucleo-titulo" className={styles.h2}>
          O Núcleo de Mana
        </h2>
        <p className={styles.headText}>As regras que valem para todo conjurador do PYM, de qualquer tradição.</p>
      </header>

      <ol className={styles.grades}>
        {s.grades.map((g, i) => (
          <li key={g.id} className={styles.grade}>
            <span className={`${styles.gradeNo} code`}>GRAU {i + 1}</span>
            <span className={styles.gradeName}>{g.label}</span>
            <span className={styles.gradeBar} style={{ '--fill': (i + 1) / s.grades.length } as CSSProperties} aria-hidden="true" />
          </li>
        ))}
      </ol>

      <div className={styles.tabs} role="tablist" aria-label="Regras do Núcleo de Mana">
        {(
          [
            ['graus', 'Graus e evolução'],
            ['natural', 'Ganho natural de Mana'],
            ['corrompida', 'Evolução corrompida'],
          ] as [RulesTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`painel-${id}`}
            className={styles.tab}
            data-tone={id === 'corrompida' ? 'blood' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'graus' && (
        <div id="painel-graus" role="tabpanel" aria-labelledby="tab-graus" className={styles.panel}>
          <div className={styles.columns}>
            <div className={styles.prose}>
              <h3 className={styles.h3}>Como funciona</h3>
              {s.howItWorks.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <h3 className={styles.h3}>A magia é universal?</h3>
              {s.universal.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className={styles.prose}>
              <h3 className={styles.h3}>Evolução do Núcleo</h3>
              {s.growth.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <ul className={styles.methods}>
                {s.methods.map((m) => (
                  <li key={m.name}>
                    <strong>{m.name}</strong>
                    <span>{m.text}</span>
                  </li>
                ))}
              </ul>
              {s.evolutionSystem.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'natural' && (
        <div id="painel-natural" role="tabpanel" aria-labelledby="tab-natural" className={styles.panel}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Atividade</th>
                  <th scope="col">Como conta</th>
                  <th scope="col" className={styles.num}>
                    Mana máxima
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.natural.map((a) => (
                  <tr key={a.name}>
                    <th scope="row">{a.name}</th>
                    <td>{a.text}</td>
                    <td className={`${styles.num} ${styles.plus}`}>+{a.mana}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.columns}>
            <div className={styles.box}>
              <h3 className={styles.h3}>Limites</h3>
              <ul className={styles.list}>
                {s.limits.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div className={styles.paths}>
              {s.paths.map((p) => (
                <div key={p.name} className={styles.path} data-tone={p.cons.length ? 'blood' : undefined}>
                  <h3 className={styles.h3}>{p.name}</h3>
                  <p>{p.text}</p>
                  <ul className={styles.pc}>
                    {p.pros.map((x) => (
                      <li key={x} data-kind="pro">
                        {x}
                      </li>
                    ))}
                    {p.cons.map((x) => (
                      <li key={x} data-kind="con">
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'corrompida' && (
        <div id="painel-corrompida" role="tabpanel" aria-labelledby="tab-corrompida" className={styles.panel}>
          <div className={styles.prose}>
            {s.note.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.blood}`}>
              <thead>
                <tr>
                  <th scope="col">Método</th>
                  <th scope="col">Como conta</th>
                  <th scope="col" className={styles.num}>
                    Mana máxima
                  </th>
                  <th scope="col" className={styles.num}>
                    Corrupção
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.corrupted.map((a) => (
                  <tr key={a.name}>
                    <th scope="row">{a.name}</th>
                    <td>{a.text}</td>
                    <td className={`${styles.num} ${styles.plus}`}>+{a.mana}</td>
                    <td className={`${styles.num} ${styles.minus}`}>+{a.corruption}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={styles.list}>
            {s.corruptedNote.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function KamarTajPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('livro');
  const open = magic.books.find((b) => b.id === openId);

  const openBook = (b: Book) => {
    const next = new URLSearchParams(params);
    next.set('livro', b.id);
    setParams(next);
  };
  const closeBook = () => {
    const next = new URLSearchParams(params);
    next.delete('livro');
    setParams(next);
  };

  const universal = magic.books.filter((b) => b.shelf === 'universal');
  const recoveredCount = magic.books.filter(isRecovered).length;
  const lostCount = magic.books.length - recoveredCount;

  return (
    <div className={styles.page}>
      <Seo
        title="Biblioteca de Kamar-Taj"
        description="O acervo de magia Eldritch do PYM: regras do Núcleo de Mana, kit inicial e os tomos recuperados depois da raid."
      />

      {/* Abertura */}
      <section className={styles.hero}>
        <div className={styles.heroArt}>
          <Mandala />
        </div>
        <div className={`container ${styles.heroText}`}>
          <nav className={styles.crumbs} aria-label="Caminho">
            <Link to="/biblioteca">Biblioteca</Link>
            <span aria-hidden="true">/</span>
            <span>Ala mística</span>
          </nav>
          <h1 className={styles.h1}>Biblioteca de Kamar-Taj</h1>
          <p className={styles.location}>{magic.school.location}</p>
          <p className={styles.lede}>{magic.school.intro}</p>
          <div className={styles.heroLinks}>
            <a href="#acervo" className={styles.heroLink} onClick={(e) => (e.preventDefault(), document.getElementById('acervo')?.scrollIntoView({ behavior: 'smooth' }))}>
              Ir ao acervo
            </a>
            <a href="#nucleo" className={styles.heroLinkGhost} onClick={(e) => (e.preventDefault(), document.getElementById('nucleo')?.scrollIntoView({ behavior: 'smooth' }))}>
              Regras do Núcleo de Mana
            </a>
          </div>
        </div>
      </section>

      {/* Acervo */}
      <section id="acervo" className={`container ${styles.section}`} aria-labelledby="acervo-titulo">
        <header className={styles.head}>
          <h2 id="acervo-titulo" className={styles.h2}>
            O acervo
          </h2>
          <div className={styles.headText}>
            {magic.library.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </header>

        <div className={styles.raid}>
          <span className={styles.raidDot} />
          <p>
            A biblioteca sofreu uma raid. {recoveredCount} livros tiveram páginas recuperadas do Event Log e brilham nas
            estantes; os outros {lostCount} aguardam restauração. Toque num livro para abri-lo.
          </p>
        </div>

        {universal.map((b) => (
          <div key={b.id} className={styles.lectern}>
            <button type="button" className={styles.lecternBook} onClick={() => openBook(b)} style={{ '--spine': b.color } as CSSProperties}>
              <span className={styles.lecternGlow} aria-hidden="true" />
              <span className={styles.lecternCover}>
                <span className={styles.lecternMandala}>
                  <Mandala variant="icon" />
                </span>
                <span className={styles.lecternTitle}>{b.title}</span>
              </span>
            </button>
            <div className={styles.lecternText}>
              <p className={`${styles.lecternKicker} code`}>PÚLPITO · CONHECIMENTO UNIVERSAL</p>
              <h3 className={styles.lecternName}>{b.title}</h3>
              <p>{b.summary} Disponível para praticantes de qualquer tradição.</p>
              <button type="button" className={styles.heroLink} onClick={() => openBook(b)}>
                Folhear o compêndio
              </button>
            </div>
          </div>
        ))}

        <div className={styles.shelves}>
          {shelfOrder.map((g, i) => {
            const books = magic.books.filter((b) => b.shelf === g);
            return (
              <div key={g} className={styles.shelf}>
                <div className={styles.shelfLabel}>
                  <span className={`${styles.gradeNo} code`}>GRAU {i + 1}</span>
                  <span className={styles.shelfName}>{shelfLabel(g)}</span>
                  <span className={styles.shelfCount}>
                    {books.length} {books.length === 1 ? 'livro' : 'livros'}
                  </span>
                </div>
                <div className={styles.shelfBoard}>
                  <ul className={styles.books}>
                    {books.map((b) => (
                      <Spine key={b.id} book={b} onOpen={openBook} />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Rules />

      {/* Kit inicial */}
      <section className={`container ${styles.section}`} aria-labelledby="kit-titulo">
        <header className={styles.head}>
          <h2 id="kit-titulo" className={styles.h2}>
            Kit inicial
          </h2>
          <p className={styles.headText}>{magic.kit.intro}</p>
        </header>
        <ul className={styles.kit}>
          {magic.kit.items.map((it) => (
            <li key={it.name} className={styles.kitItem}>
              <h3 className={styles.kitName}>{it.name}</h3>
              <p>{it.text}</p>
              {it.effect && <p className={styles.kitEffect}>{it.effect}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* A Ordem */}
      <section className={`container ${styles.section}`} aria-labelledby="ordem-titulo">
        <header className={styles.head}>
          <h2 id="ordem-titulo" className={styles.h2}>
            A Ordem
          </h2>
        </header>
        <div className={styles.order}>
          <div className={styles.orderCol}>
            <h3 className={styles.h3}>Protocolo</h3>
            <p>{magic.school.protocol}</p>
          </div>
          <div className={styles.orderCol}>
            <h3 className={styles.h3}>Dimensões</h3>
            <p>{magic.school.dimensions}</p>
          </div>
          <div className={styles.orderCol} data-tone="blood">
            <h3 className={styles.h3}>Restrições</h3>
            <ul className={styles.list}>
              {magic.school.restrictions.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className={styles.credit}>{magic.library.credit}</p>
      </section>

      {open && <BookReader key={open.id} book={open} onClose={closeBook} />}
    </div>
  );
}
