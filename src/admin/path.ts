export function getIn(obj: unknown, path: string[]): unknown {
  let cur = obj;
  for (const k of path) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export function setIn(obj: unknown, path: string[], value: unknown): unknown {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const base = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  return { ...base, [k]: setIn(base[k], rest, value) };
}

/** Parte do arquivo que pertence a uma seção (formulários na raiz só olham os próprios campos). */
export function sectionValue(file: unknown, sec: { path: string[]; type: string; fields: { key: string }[] }): unknown {
  const v = getIn(file, sec.path);
  if (sec.type !== 'object' || !v || typeof v !== 'object') return v;
  const o = v as Record<string, unknown>;
  return Object.fromEntries(sec.fields.map((f) => [f.key, o[f.key]]));
}
