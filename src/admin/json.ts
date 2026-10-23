/**
 * JSON formatado como os arquivos do repositório: 2 espaços de recuo, e listas
 * curtas de números (coordenadas) na mesma linha para o diff ficar legível.
 */
export function pretty(value: unknown): string {
  return `${write(value, '')}\n`;
}

const isNumList = (v: unknown): v is number[] => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number');

function write(v: unknown, indent: string): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  const next = `${indent}  `;
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (isNumList(v)) return `[${v.join(', ')}]`;
    if (v.every(isNumList)) return `[${v.map((p) => `[${p.join(', ')}]`).join(', ')}]`;
    if (v.every((x) => typeof x === 'string' && x.length < 40) && v.join('').length < 70) return `[${v.map((x) => JSON.stringify(x)).join(', ')}]`;
    return `[\n${v.map((x) => next + write(x, next)).join(',\n')}\n${indent}]`;
  }
  const entries = Object.entries(v as Record<string, unknown>).filter(([, x]) => x !== undefined);
  if (entries.length === 0) return '{}';
  return `{\n${entries.map(([k, x]) => `${next}${JSON.stringify(k)}: ${write(x, next)}`).join(',\n')}\n${indent}}`;
}

/** Remove campos vazios (texto em branco) antes de salvar. */
export function clean<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined) as T;
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const c = clean(x);
      if (c === undefined || c === '') continue;
      out[k] = c;
    }
    return out as T;
  }
  return v;
}

/** "Rua Lucca's G." → "rua-luccas-g" */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
