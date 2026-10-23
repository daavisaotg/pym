import { useId, useRef, useState, type ReactNode } from 'react';
import { asset } from '@/lib/asset';
import type { Field, Option, RefSource } from './schema';
import { useEditorEnv } from './context';
import { addUpload, useAdmin } from './store';
import { slugify } from './json';
import { GeoField, LonLatField } from './GeoField';
import styles from './Admin.module.css';

type Rec = Record<string, unknown>;
type Change = (v: unknown) => void;

const isRec = (v: unknown): v is Rec => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const asStr = (v: unknown) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
const prettyKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

/* ── Moldura de um campo ────────────────────────────────────── */

function Frame({ field, children, id }: { field: Field; children: ReactNode; id?: string }) {
  return (
    <div className={styles.field} data-half={field.half || undefined} data-kind={field.kind}>
      <label className={styles.label} htmlFor={id}>
        {field.label}
        {field.required && <span className={styles.req} aria-label="obrigatório"> *</span>}
      </label>
      {children}
      {field.help && <p className={styles.help}>{field.help}</p>}
    </div>
  );
}

/** Botões pequenos de ordenar e remover itens de lista. */
function ItemTools({ i, n, onMove, onRemove, label }: { i: number; n: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  return (
    <span className={styles.itemTools}>
      <button type="button" onClick={() => onMove(i - 1)} disabled={i === 0} aria-label={`Subir ${label}`} title="Subir">
        ↑
      </button>
      <button type="button" onClick={() => onMove(i + 1)} disabled={i === n - 1} aria-label={`Descer ${label}`} title="Descer">
        ↓
      </button>
      <button type="button" onClick={onRemove} aria-label={`Remover ${label}`} title="Remover" data-danger>
        ×
      </button>
    </span>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** Textarea que cresce com o texto. */
function AutoText({ value, onChange, rows = 3, id, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; id?: string; placeholder?: string }) {
  return (
    <textarea
      id={id}
      className={styles.input}
      value={value}
      rows={Math.max(rows, Math.min(18, Math.ceil(value.length / 90) + value.split('\n').length))}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ── Campo genérico ─────────────────────────────────────────── */

export function FieldEditor({ field, value, onChange, record }: { field: Field; value: unknown; onChange: Change; record: Rec }) {
  const id = useId();
  if (field.when && !field.when(record)) return null;
  const str = asStr(value);
  const setText = (v: string) => onChange(v === '' ? undefined : v);

  switch (field.kind) {
    case 'text':
      return (
        <Frame field={field} id={id}>
          <input id={id} className={styles.input} value={str} placeholder={field.placeholder} onChange={(e) => setText(e.target.value)} />
        </Frame>
      );
    case 'textarea':
    case 'longtext':
      return (
        <Frame field={field} id={id}>
          <AutoText id={id} value={str} rows={field.kind === 'longtext' ? 8 : 3} onChange={setText} placeholder={field.placeholder} />
        </Frame>
      );
    case 'number':
      return (
        <Frame field={field} id={id}>
          <input
            id={id}
            type="number"
            className={styles.input}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
        </Frame>
      );
    case 'boolean':
      return (
        <div className={styles.field} data-half={field.half || undefined} data-kind="boolean">
          <label className={styles.check}>
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked ? true : undefined)} />
            <span>{field.label}</span>
          </label>
          {field.help && <p className={styles.help}>{field.help}</p>}
        </div>
      );
    case 'select':
      return (
        <Frame field={field} id={id}>
          <Select id={id} value={str} options={field.options ?? []} required={field.required} onChange={setText} />
        </Frame>
      );
    case 'color':
      return (
        <Frame field={field} id={id}>
          <span className={styles.colorRow}>
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(str) ? str : '#8a0303'} onChange={(e) => onChange(e.target.value)} aria-label={field.label} />
            <input id={id} className={styles.input} value={str} placeholder="#8a0303" onChange={(e) => setText(e.target.value)} />
          </span>
        </Frame>
      );
    case 'image':
      return (
        <Frame field={field} id={id}>
          <ImageInput id={id} value={str} folder={field.folder} onChange={setText} />
        </Frame>
      );
    case 'images':
      return (
        <Frame field={field}>
          <ImagesInput value={Array.isArray(value) ? (value as string[]) : []} folder={field.folder} onChange={onChange} />
        </Frame>
      );
    case 'strings':
      return (
        <Frame field={field}>
          <StringList value={Array.isArray(value) ? (value as unknown[]).map(asStr) : []} onChange={onChange} label={field.label} />
        </Frame>
      );
    case 'ref':
      return (
        <Frame field={field} id={id}>
          <RefSelect id={id} value={str} sources={field.refs ?? []} onChange={setText} />
        </Frame>
      );
    case 'refs':
      return (
        <Frame field={field}>
          <RefList value={Array.isArray(value) ? (value as string[]) : []} sources={field.refs ?? []} free={false} onChange={onChange} label={field.label} />
        </Frame>
      );
    case 'nameref':
      return (
        <Frame field={field} id={id}>
          <NameRefInput id={id} value={str} sources={field.refs ?? []} onChange={setText} />
        </Frame>
      );
    case 'namerefs':
      return (
        <Frame field={field}>
          <RefList value={Array.isArray(value) ? (value as string[]) : []} sources={field.refs ?? []} free onChange={onChange} label={field.label} />
        </Frame>
      );
    case 'lore':
      return (
        <Frame field={field}>
          <LoreEditor value={Array.isArray(value) ? value : []} onChange={onChange} />
        </Frame>
      );
    case 'facts':
      return (
        <Frame field={field}>
          <FactsEditor value={Array.isArray(value) ? (value as Rec[]) : []} onChange={onChange} />
        </Frame>
      );
    case 'object':
      return (
        <fieldset className={styles.group}>
          <legend>{field.label}</legend>
          {field.help && <p className={styles.help}>{field.help}</p>}
          <ObjectFields fields={field.fields ?? []} value={isRec(value) ? value : {}} onChange={onChange} />
        </fieldset>
      );
    case 'list':
      return (
        <fieldset className={styles.group}>
          <legend>{field.label}</legend>
          {field.help && <p className={styles.help}>{field.help}</p>}
          <ObjectList field={field} value={Array.isArray(value) ? (value as Rec[]) : []} onChange={onChange} />
        </fieldset>
      );
    case 'traits':
      return (
        <Frame field={field}>
          <TraitsEditor value={Array.isArray(value) ? (value as Rec[]) : []} onChange={onChange} />
        </Frame>
      );
    case 'dict':
      return (
        <fieldset className={styles.group}>
          <legend>{field.label}</legend>
          {(field.dictKeys ?? []).map((k) => {
            const obj = isRec(value) ? value : {};
            return (
              <FieldEditor
                key={k.value}
                field={{ key: k.value, label: k.label, kind: 'textarea' }}
                value={obj[k.value]}
                record={obj}
                onChange={(v) => onChange({ ...obj, [k.value]: v })}
              />
            );
          })}
        </fieldset>
      );
    case 'geo':
      return (
        <Frame field={field}>
          <GeoField mode={field.geo ?? 'point'} value={value} record={record} onChange={onChange} />
        </Frame>
      );
    case 'lonlat':
      return (
        <Frame field={field}>
          <LonLatField value={value} record={record} onChange={onChange} />
        </Frame>
      );
    case 'auto':
    default:
      return <AutoField label={field.label} help={field.help} value={value} onChange={onChange} />;
  }
}

/** Vários campos de um objeto. Campos fora do esquema vão para "Outros campos". */
export function ObjectFields({ fields, value, onChange, extras = true }: { fields: Field[]; value: Rec; onChange: Change; extras?: boolean }) {
  const known = new Set(fields.map((f) => f.key));
  const others = extras ? Object.keys(value).filter((k) => !known.has(k)) : [];
  return (
    <div className={styles.fields}>
      {fields.map((f) => (
        <FieldEditor key={f.key} field={f} value={value[f.key]} record={value} onChange={(v) => onChange({ ...value, [f.key]: v })} />
      ))}
      {others.length > 0 && (
        <details className={styles.others}>
          <summary>Outros campos ({others.length})</summary>
          <div className={styles.fields}>
            {others.map((k) => (
              <AutoField key={k} label={prettyKey(k)} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ── Seleções ───────────────────────────────────────────────── */

function Select({ id, value, options, required, onChange }: { id?: string; value: string; options: Option[]; required?: boolean; onChange: (v: string) => void }) {
  const known = options.some((o) => o.value === value);
  return (
    <select id={id} className={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
      {(!required || !value) && <option value="">—</option>}
      {!known && value && <option value={value}>{value} (fora da lista)</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function useOptions(sources: RefSource[]): Option[] {
  const { refs } = useEditorEnv();
  return sources.flatMap((s) => refs[s] ?? []);
}

function RefSelect({ id, value, sources, onChange }: { id?: string; value: string; sources: RefSource[]; onChange: (v: string) => void }) {
  const options = useOptions(sources);
  const known = !value || options.some((o) => o.value === value);
  return (
    <>
      <Select id={id} value={value} options={options} onChange={onChange} />
      {!known && <p className={styles.warn}>Nenhum registro com o ID “{value}”.</p>}
    </>
  );
}

function NameRefInput({ id, value, sources, onChange }: { id: string; value: string; sources: RefSource[]; onChange: (v: string) => void }) {
  const options = useOptions(sources);
  const listId = `${id}-list`;
  const linked = options.find((o) => o.value === value);
  return (
    <>
      <input id={id} className={styles.input} value={value} list={listId} onChange={(e) => onChange(e.target.value)} placeholder="Nome livre ou ID de um registro" />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </datalist>
      {linked && <p className={styles.linked}>Ligado a {linked.label}</p>}
    </>
  );
}

/** Lista de ids (refs) ou de nomes/ids (namerefs). */
function RefList({ value, sources, free, onChange, label }: { value: string[]; sources: RefSource[]; free: boolean; onChange: Change; label: string }) {
  const options = useOptions(sources);
  const [text, setText] = useState('');
  const listId = useId();
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label;
  const add = (v: string) => {
    const t = v.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setText('');
  };
  return (
    <div className={styles.chips}>
      <ul>
        {value.map((v, i) => (
          <li key={v} className={styles.chip} data-linked={labelOf(v) ? '' : undefined} data-missing={!free && !labelOf(v) ? '' : undefined}>
            <span>{labelOf(v) ?? v}</span>
            <button type="button" onClick={() => onChange(move(value, i, i - 1))} disabled={i === 0} aria-label={`Mover ${v} para antes`}>
              ‹
            </button>
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remover ${v} de ${label}`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      {free ? (
        <span className={styles.addRow}>
          <input
            className={styles.input}
            value={text}
            list={listId}
            placeholder="Nome ou ID de um registro"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(text);
              }
            }}
          />
          <datalist id={listId}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </datalist>
          <button type="button" className={styles.small} onClick={() => add(text)}>
            Adicionar
          </button>
        </span>
      ) : (
        <select className={styles.input} value="" onChange={(e) => add(e.target.value)} aria-label={`Adicionar a ${label}`}>
          <option value="">+ Adicionar…</option>
          {options
            .filter((o) => !value.includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}

/* ── Listas ─────────────────────────────────────────────────── */

function StringList({ value, onChange, label }: { value: string[]; onChange: Change; label: string }) {
  return (
    <div className={styles.stack}>
      {value.map((v, i) => (
        <div key={i} className={styles.stringRow}>
          <AutoText value={v} rows={1} onChange={(t) => onChange(value.map((x, j) => (j === i ? t : x)))} />
          <ItemTools i={i} n={value.length} label={`item ${i + 1} de ${label}`} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => onChange([...value, ''])}>
        + Adicionar item
      </button>
    </div>
  );
}

function ObjectList({ field, value, onChange }: { field: Field; value: Rec[]; onChange: Change }) {
  const [open, setOpen] = useState<number | null>(value.length === 1 ? 0 : null);
  const title = (item: Rec, i: number) => field.itemTitle?.(item, i) || asStr(item.name) || asStr(item.title) || asStr(item.label) || `Item ${i + 1}`;
  return (
    <div className={styles.stack}>
      {value.map((item, i) => (
        <div key={i} className={styles.card} data-open={open === i || undefined}>
          <div className={styles.cardHead}>
            <button type="button" className={styles.cardToggle} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className={styles.caret}>{open === i ? '▾' : '▸'}</span>
              {title(item, i)}
            </button>
            <ItemTools
              i={i}
              n={value.length}
              label={title(item, i)}
              onMove={(to) => {
                onChange(move(value, i, to));
                if (open === i) setOpen(to);
              }}
              onRemove={() => {
                onChange(value.filter((_, j) => j !== i));
                setOpen(null);
              }}
            />
          </div>
          {open === i && (
            <div className={styles.cardBody}>
              <ObjectFields fields={field.fields ?? []} value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        className={styles.add}
        onClick={() => {
          onChange([...value, (field.template?.() as Rec) ?? {}]);
          setOpen(value.length);
        }}
      >
        + Adicionar {field.label.toLowerCase()}
      </button>
    </div>
  );
}

function FactsEditor({ value, onChange }: { value: Rec[]; onChange: Change }) {
  return (
    <div className={styles.stack}>
      {value.map((f, i) => (
        <div key={i} className={styles.factRow}>
          <input className={styles.input} value={asStr(f.label)} placeholder="Rótulo" aria-label="Rótulo" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input className={styles.input} value={asStr(f.value)} placeholder="Valor" aria-label="Valor" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
          <ItemTools i={i} n={value.length} label={asStr(f.label) || 'informação'} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => onChange([...value, { label: '', value: '' }])}>
        + Adicionar informação
      </button>
    </div>
  );
}

function TraitsEditor({ value, onChange, depth = 0 }: { value: Rec[]; onChange: Change; depth?: number }) {
  return (
    <div className={styles.stack} data-depth={depth}>
      {value.map((t, i) => (
        <div key={i} className={styles.trait}>
          <div className={styles.stringRow}>
            <input className={styles.input} value={asStr(t.name)} placeholder="Nome" aria-label="Nome do poder" onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <ItemTools i={i} n={value.length} label={asStr(t.name) || 'item'} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
          </div>
          {depth < 2 && (
            <div className={styles.traitKids}>
              <TraitsEditor
                depth={depth + 1}
                value={Array.isArray(t.details) ? (t.details as Rec[]) : []}
                onChange={(d) => onChange(value.map((x, j) => (j === i ? { ...x, details: (d as Rec[]).length ? d : undefined } : x)))}
              />
            </div>
          )}
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => onChange([...value, { name: '' }])}>
        + {depth ? 'Sub-item' : 'Adicionar'}
      </button>
    </div>
  );
}

/* ── Lore ───────────────────────────────────────────────────── */

type Block = string | { heading: string } | { speaker: string; text: string };
const blockKind = (b: unknown) => (typeof b === 'string' ? 'p' : isRec(b) && 'heading' in b ? 'h' : 's');

export function LoreEditor({ value, onChange }: { value: unknown[]; onChange: Change }) {
  const blocks = value as Block[];
  const set = (i: number, b: Block) => onChange(blocks.map((x, j) => (j === i ? b : x)));
  const convert = (b: Block, to: string): Block => {
    const text = typeof b === 'string' ? b : 'heading' in b ? b.heading : b.text;
    if (to === 'p') return text;
    if (to === 'h') return { heading: text };
    return { speaker: isRec(b) && 'speaker' in b ? b.speaker : '', text };
  };
  return (
    <div className={styles.stack}>
      {blocks.map((b, i) => {
        const k = blockKind(b);
        return (
          <div key={i} className={styles.block} data-kind={k}>
            <div className={styles.blockHead}>
              <select className={styles.blockType} value={k} onChange={(e) => set(i, convert(b, e.target.value))} aria-label="Tipo de bloco">
                <option value="p">Parágrafo</option>
                <option value="h">Intertítulo</option>
                <option value="s">Fala</option>
              </select>
              <ItemTools i={i} n={blocks.length} label={`bloco ${i + 1}`} onMove={(to) => onChange(move(blocks, i, to))} onRemove={() => onChange(blocks.filter((_, j) => j !== i))} />
            </div>
            {k === 'p' && <AutoText value={b as string} onChange={(t) => set(i, t)} />}
            {k === 'h' && <input className={styles.input} value={(b as { heading: string }).heading} onChange={(e) => set(i, { heading: e.target.value })} placeholder="Intertítulo" />}
            {k === 's' && (
              <>
                <input
                  className={styles.input}
                  value={(b as { speaker: string }).speaker}
                  placeholder="Quem fala"
                  onChange={(e) => set(i, { speaker: e.target.value, text: (b as { text: string }).text })}
                />
                <AutoText value={(b as { text: string }).text} onChange={(t) => set(i, { speaker: (b as { speaker: string }).speaker, text: t })} />
              </>
            )}
          </div>
        );
      })}
      <span className={styles.addRow}>
        <button type="button" className={styles.add} onClick={() => onChange([...blocks, ''])}>
          + Parágrafo
        </button>
        <button type="button" className={styles.add} onClick={() => onChange([...blocks, { heading: '' }])}>
          + Intertítulo
        </button>
        <button type="button" className={styles.add} onClick={() => onChange([...blocks, { speaker: '', text: '' }])}>
          + Fala
        </button>
      </span>
    </div>
  );
}

/* ── Imagens ────────────────────────────────────────────────── */

/** Reduz a imagem para no máximo 1600 px e converte para WebP. */
async function toWebp(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ImageInput({ id, value, folder = 'geral', onChange }: { id?: string; value: string; folder?: string; onChange: (v: string) => void }) {
  const { recordName } = useEditorEnv();
  const { uploads } = useAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const src = value ? asset(value) : undefined;

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Escolha um arquivo de imagem.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const data = await toWebp(file);
      const base = slugify(recordName || file.name.replace(/\.[^.]+$/, '')) || 'imagem';
      const path = `uploads/${folder}/${base}-${Date.now().toString(36).slice(-5)}.webp`;
      addUpload(path, data);
      onChange(path);
    } catch {
      setErr('Não foi possível ler esta imagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.image}>
      <div className={styles.thumb} data-empty={!src || undefined}>
        {src ? <img src={src} alt="" /> : <span>Sem imagem</span>}
        {value && uploads[value] && <span className={styles.newBadge}>nova</span>}
      </div>
      <div className={styles.imageSide}>
        <input id={id} className={styles.input} value={value} placeholder="uploads/pasta/arquivo.webp ou URL" onChange={(e) => onChange(e.target.value)} />
        <span className={styles.addRow}>
          <button type="button" className={styles.small} onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Preparando…' : 'Enviar imagem'}
          </button>
          {value && (
            <button type="button" className={styles.small} onClick={() => onChange('')}>
              Tirar imagem
            </button>
          )}
        </span>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? undefined).then(() => (e.target.value = ''))} />
        {err && <p className={styles.warn}>{err}</p>}
      </div>
    </div>
  );
}

function ImagesInput({ value, folder, onChange }: { value: string[]; folder?: string; onChange: Change }) {
  return (
    <div className={styles.stack}>
      {value.map((v, i) => (
        <div key={i} className={styles.imageRow}>
          <ImageInput value={v} folder={folder} onChange={(t) => onChange(t ? value.map((x, j) => (j === i ? t : x)) : value.filter((_, j) => j !== i))} />
          <ItemTools i={i} n={value.length} label={`foto ${i + 1}`} onMove={(to) => onChange(move(value, i, to))} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className={styles.add} onClick={() => onChange([...value, ''])}>
        + Adicionar foto
      </button>
    </div>
  );
}

/* ── Campos sem esquema ─────────────────────────────────────── */

export function AutoField({ label, help, value, onChange }: { label: string; help?: string; value: unknown; onChange: Change }) {
  const field: Field = { key: label, label, kind: 'text', help };
  if (typeof value === 'boolean') return <FieldEditor field={{ ...field, kind: 'boolean' }} value={value} record={{}} onChange={onChange} />;
  if (typeof value === 'number') return <FieldEditor field={{ ...field, kind: 'number' }} value={value} record={{}} onChange={onChange} />;
  if (typeof value === 'string' || value === undefined || value === null)
    return <FieldEditor field={{ ...field, kind: asStr(value).length > 60 ? 'textarea' : 'text' }} value={value ?? ''} record={{}} onChange={onChange} />;
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === 'number')) {
      return (
        <Frame field={field}>
          <span className={styles.numRow}>
            {value.map((n, i) => (
              <input
                key={i}
                type="number"
                className={styles.input}
                value={n as number}
                aria-label={`${label} ${i + 1}`}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? Number(e.target.value) : x)))}
              />
            ))}
          </span>
        </Frame>
      );
    }
    if (value.every((x) => typeof x === 'string')) return <FieldEditor field={{ ...field, kind: 'strings' }} value={value} record={{}} onChange={onChange} />;
    if (value.every(isRec)) {
      const keys = [...new Set(value.flatMap((x) => Object.keys(x as Rec)))];
      const sample = (k: string) => (value as Rec[]).find((x) => x[k] !== undefined)?.[k];
      const fields: Field[] = keys.map((k) => ({ key: k, label: prettyKey(k), kind: 'auto' }));
      const blank = () => Object.fromEntries(keys.map((k) => [k, typeof sample(k) === 'number' ? 0 : Array.isArray(sample(k)) ? [] : '']));
      return <FieldEditor field={{ ...field, kind: 'list', fields, template: blank }} value={value} record={{}} onChange={onChange} />;
    }
  }
  if (isRec(value)) {
    return (
      <fieldset className={styles.group}>
        <legend>{label}</legend>
        {help && <p className={styles.help}>{help}</p>}
        <div className={styles.fields}>
          {Object.keys(value).map((k) => (
            <AutoField key={k} label={prettyKey(k)} value={value[k]} onChange={(v) => onChange({ ...value, [k]: v })} />
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <Frame field={field}>
      <pre className={styles.raw}>{JSON.stringify(value)}</pre>
    </Frame>
  );
}
