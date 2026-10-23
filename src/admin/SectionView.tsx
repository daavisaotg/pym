import { useEffect, useMemo, useRef, useState } from 'react';
import { normalize } from '@/lib/asset';
import { useLocation, useNavigate, toHref } from '@/router/router';
import { sections, type Section } from './schema';
import { EditorProvider, useRefOptions } from './context';
import { ObjectFields } from './fields';
import { discard, isDirty, update, useAdmin } from './store';
import { getIn, sectionValue, setIn } from './path';
import { slugify } from './json';
import type { CityContent } from '@/data/city';
import styles from './Admin.module.css';

type Rec = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Uma seção do painel: lista de registros com editor, ou um formulário único. */
export function SectionView({ section }: { section: Section }) {
  const { files } = useAdmin();
  const file = files[section.file];
  const refs = useRefOptions();
  if (!file) return <p className={styles.empty}>Carregando…</p>;
  const city = (section.file === 'ascent' ? files.ascent : files.city)?.draft as CityContent | undefined;

  const value = getIn(file.draft, section.path);
  const setValue = (v: unknown) => update(section.file, setIn(file.draft, section.path, v));

  if (section.type === 'object') {
    const obj = (value && typeof value === 'object' ? value : {}) as Rec;
    const dirty = !same(sectionValue(file.base, section), sectionValue(file.draft, section));
    return (
      <EditorProvider value={{ refs, city, recordName: section.label }}>
        <div className={styles.single}>
          <header className={styles.editorHead}>
            <div>
              <p className={`${styles.kicker} code`}>{section.group.toUpperCase()}</p>
              <h1 className={styles.h1}>{section.label}</h1>
              {section.hint && <p className={styles.muted}>{section.hint}</p>}
            </div>
            <div className={styles.headActions}>
              {section.viewHref && (
                <a className={styles.ghost} href={toHref(section.viewHref({}) ?? '/')} target="_blank" rel="noreferrer">
                  Ver no site ↗
                </a>
              )}
              {dirty && (
                <button type="button" className={styles.ghost} onClick={() => setValue({ ...obj, ...(structuredClone(sectionValue(file.base, section)) as Rec) })}>
                  Desfazer alterações
                </button>
              )}
            </div>
          </header>
          <ObjectFields fields={section.fields} value={obj} onChange={setValue} extras={sections.filter((x) => x.file === section.file).length === 1} />
        </div>
      </EditorProvider>
    );
  }

  return <ListSection section={section} list={Array.isArray(value) ? (value as Rec[]) : []} baseList={(getIn(file.base, section.path) as Rec[]) ?? []} setList={setValue} refs={refs} city={city} fileDirty={isDirty(file)} />;
}

function ListSection({
  section,
  list,
  baseList,
  setList,
  refs,
  city,
  fileDirty,
}: {
  section: Section;
  list: Rec[];
  baseList: Rec[];
  setList: (v: Rec[]) => void;
  refs: ReturnType<typeof useRefOptions>;
  city?: CityContent;
  fileDirty: boolean;
}) {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  const idKey = section.idKey ?? 'id';
  const nameKey = section.nameKey ?? 'name';
  const selectedId = new URLSearchParams(search).get('id');
  const [query, setQuery] = useState('');
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const index = list.findIndex((r) => s(r[idKey]) === selectedId);
  const record = index >= 0 ? list[index] : undefined;
  const select = (id: string | null, replace = false) => navigate(`${pathname}${id ? `?id=${encodeURIComponent(id)}` : ''}`, { replace });

  useEffect(() => {
    setConfirmDelete(false);
    editorRef.current?.scrollTo(0, 0);
  }, [selectedId]);

  const title = (r: Rec) => section.titleOf?.(r) || s(r[nameKey]) || s(r[idKey]) || '(sem nome)';
  const baseById = useMemo(() => new Map(baseList.map((r) => [s(r[idKey]), r])), [baseList, idKey]);
  const stateOf = (r: Rec) => {
    const b = baseById.get(s(r[idKey]));
    if (!b) return 'novo';
    return same(b, r) ? undefined : 'editado';
  };
  const removed = baseList.filter((b) => !list.some((r) => s(r[idKey]) === s(b[idKey])));

  const filtered = useMemo(() => {
    const q = normalize(query);
    return list
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => !q || normalize(`${title(r)} ${section.subtitleOf?.(r) ?? ''} ${s(r[idKey])}`).includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, query]);

  const uniqueId = (base: string, except?: number) => {
    let id = base || 'novo';
    let n = 2;
    while (list.some((r, i) => i !== except && s(r[idKey]) === id)) id = `${base}-${n++}`;
    return id;
  };

  const add = (from?: Rec) => {
    const name = from ? `${s(from[nameKey])} (cópia)` : `Novo registro`;
    const id = uniqueId(slugify(name));
    const rec: Rec = { ...(from ? structuredClone(from) : (section.template?.() ?? {})), [nameKey]: name, [idKey]: idKey === nameKey ? name : id };
    if (section.slug) rec.slug = id;
    const at = from ? index + 1 : list.length;
    setList([...list.slice(0, at), rec, ...list.slice(at)]);
    if (idKey !== nameKey) setFresh((f) => new Set(f).add(id));
    select(s(rec[idKey]));
  };

  const change = (next: Rec) => {
    if (index < 0) return;
    let rec = next;
    const oldId = s(record?.[idKey]);
    // Registro recém-criado: id e slug acompanham o nome até serem editados à mão
    if (fresh.has(oldId) && idKey !== nameKey) {
      if (s(next[idKey]) !== oldId || (section.slug && s(next.slug) !== s(record?.slug))) {
        setFresh((f) => {
          const n = new Set(f);
          n.delete(oldId);
          return n;
        });
      } else if (s(next[nameKey]) !== s(record?.[nameKey])) {
        const id = uniqueId(slugify(s(next[nameKey])), index);
        rec = { ...next, [idKey]: id, ...(section.slug ? { slug: id } : {}) };
        setFresh((f) => {
          const n = new Set(f);
          n.delete(oldId);
          n.add(id);
          return n;
        });
      }
    }
    setList(list.map((r, i) => (i === index ? rec : r)));
    if (s(rec[idKey]) !== oldId) select(s(rec[idKey]), true);
  };

  const remove = () => {
    setList(list.filter((_, i) => i !== index));
    select(null, true);
  };

  const moveTo = (to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [x] = next.splice(index, 1);
    next.splice(to, 0, x);
    setList(next);
  };

  /* Avisos do registro aberto */
  const { files } = useAdmin();
  const warnings: string[] = [];
  if (record) {
    for (const f of section.fields) {
      if (f.required && (f.when ? f.when(record) : true) && (record[f.key] === undefined || record[f.key] === '')) warnings.push(`Preencha “${f.label}”.`);
    }
    const id = s(record[idKey]);
    if (list.filter((r) => s(r[idKey]) === id).length > 1) warnings.push(`Outro registro já usa o ID “${id}”.`);
    if (section.slug && list.filter((r) => s(r.slug) === s(record.slug)).length > 1) warnings.push(`Outro registro já usa o endereço “${s(record.slug)}”.`);
    if (section.slug && record.slug && !/^[a-z0-9-]+$/.test(s(record.slug))) warnings.push('O endereço deve ter só letras minúsculas sem acento, números e hífens.');
  }
  const usage = useMemo(() => {
    if (!record || idKey !== 'id') return 0;
    const id = s(record.id);
    if (!id) return 0;
    const all = Object.values(files)
      .map((f) => JSON.stringify(f?.draft))
      .join('');
    const own = JSON.stringify(record);
    return Math.max(0, all.split(`"${id}"`).length - own.split(`"${id}"`).length);
  }, [files, record, idKey]);

  const state = record ? stateOf(record) : undefined;
  const href = record && section.viewHref?.(record);

  return (
    <div className={styles.split} data-open={record ? '' : undefined}>
      <aside className={styles.listPane} aria-label={`Lista: ${section.label}`}>
        <header className={styles.listHead}>
          <div>
            <p className={`${styles.kicker} code`}>{section.group.toUpperCase()}</p>
            <h1 className={styles.h1}>{section.label}</h1>
            <p className={styles.muted}>
              {list.length} {list.length === 1 ? 'registro' : 'registros'}
              {fileDirty ? ' · com alterações' : ''}
            </p>
          </div>
          <button type="button" className={styles.primary} onClick={() => add()}>
            + Novo
          </button>
        </header>
        <input className={styles.input} type="search" placeholder="Filtrar…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filtrar registros" />
        <ul className={styles.records} data-native-scroll>
          {filtered.map(({ r, i }) => {
            const st = stateOf(r);
            return (
              <li key={`${s(r[idKey])}-${i}`}>
                <button type="button" className={styles.recordBtn} aria-current={i === index ? 'true' : undefined} onClick={() => select(s(r[idKey]))}>
                  <span className={styles.recordTitle}>
                    {title(r)}
                    {r.draft === true && <span className={styles.tag}>rascunho</span>}
                  </span>
                  {section.subtitleOf && <span className={styles.recordSub}>{section.subtitleOf(r)}</span>}
                  {st && <span className={styles.state} data-state={st}>{st}</span>}
                </button>
              </li>
            );
          })}
          {!filtered.length && <li className={styles.empty}>{query ? 'Nada encontrado.' : 'Nenhum registro ainda.'}</li>}
        </ul>
        {removed.length > 0 && (
          <p className={styles.removed}>
            Removidos neste rascunho: {removed.map((r) => title(r)).join(', ')}
          </p>
        )}
      </aside>

      <section ref={editorRef} className={styles.editorPane} data-native-scroll aria-label="Editor">
        {record ? (
          <EditorProvider value={{ refs, city, recordName: s(record[nameKey]) || s(record[idKey]) }}>
            <header className={styles.editorHead}>
              <div>
                <button type="button" className={styles.back} onClick={() => select(null)}>
                  ← {section.label}
                </button>
                <h2 className={styles.h2}>{title(record)}</h2>
                <p className={`${styles.muted} code`}>
                  {idKey}: {s(record[idKey]) || '—'}
                  {state && (
                    <span className={styles.state} data-state={state}>
                      {state}
                    </span>
                  )}
                </p>
              </div>
              <div className={styles.headActions}>
                {href && (
                  <a className={styles.ghost} href={toHref(href)} target="_blank" rel="noreferrer">
                    Ver no site ↗
                  </a>
                )}
                {section.ordered !== false && (
                  <>
                    <button type="button" className={styles.ghost} onClick={() => moveTo(index - 1)} disabled={index === 0} aria-label="Mover para cima na lista">
                      ↑
                    </button>
                    <button type="button" className={styles.ghost} onClick={() => moveTo(index + 1)} disabled={index === list.length - 1} aria-label="Mover para baixo na lista">
                      ↓
                    </button>
                  </>
                )}
                <button type="button" className={styles.ghost} onClick={() => add(record)}>
                  Duplicar
                </button>
                {state === 'editado' && (
                  <button type="button" className={styles.ghost} onClick={() => change(structuredClone(baseById.get(s(record[idKey]))!))}>
                    Desfazer
                  </button>
                )}
                {confirmDelete ? (
                  <span className={styles.confirm}>
                    <button type="button" className={styles.danger} onClick={remove}>
                      Confirmar exclusão
                    </button>
                    <button type="button" className={styles.ghost} onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button type="button" className={styles.ghost} data-danger onClick={() => setConfirmDelete(true)}>
                    Excluir
                  </button>
                )}
              </div>
            </header>
            {confirmDelete && usage > 0 && (
              <p className={styles.warnBox}>
                O ID “{s(record.id)}” aparece em mais {usage} {usage === 1 ? 'lugar' : 'lugares'} do conteúdo. Essas ligações vão ficar quebradas.
              </p>
            )}
            {warnings.length > 0 && (
              <ul className={styles.warnBox}>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            <ObjectFields fields={section.fields} value={record} onChange={(v) => change(v as Rec)} />
          </EditorProvider>
        ) : (
          <div className={styles.placeholder}>
            <p className={`${styles.kicker} code`}>NENHUM REGISTRO ABERTO</p>
            <p>Escolha um item da lista para editar, ou crie um novo.</p>
            {fileDirty && (
              <button type="button" className={styles.ghost} onClick={() => discard(section.file)}>
                Descartar todas as alterações deste arquivo
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
