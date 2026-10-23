/**
 * Todos os arquivos de conteúdo do site, com o caminho no repositório.
 * O painel administrativo edita exatamente estes arquivos.
 */
export const contentFiles = {
  characters: { path: 'src/content/characters.json', load: () => import('@/content/characters.json') },
  earths: { path: 'src/content/earths.json', load: () => import('@/content/earths.json') },
  events: { path: 'src/content/events.json', load: () => import('@/content/events.json') },
  factions: { path: 'src/content/factions.json', load: () => import('@/content/factions.json') },
  news: { path: 'src/content/news.json', load: () => import('@/content/news.json') },
  library: { path: 'src/content/library.json', load: () => import('@/content/library.json') },
  fame: { path: 'src/content/fame.json', load: () => import('@/content/fame.json') },
  magic: { path: 'src/content/magic.json', load: () => import('@/content/magic.json') },
  city: { path: 'src/content/city.json', load: () => import('@/content/city.json') },
  ascent: { path: 'src/content/ascent.json', load: () => import('@/content/ascent.json') },
  world: { path: 'src/content/world.json', load: () => import('@/content/world.json') },
  site: { path: 'src/content/site.json', load: () => import('@/content/site.json') },
  status: { path: 'src/content/status.json', load: () => import('@/content/status.json') },
} as const;

export type ContentFileId = keyof typeof contentFiles;
export const contentFileIds = Object.keys(contentFiles) as ContentFileId[];

/* ── Rascunhos do painel (guardados neste navegador) ─────────── */

export const DRAFTS_KEY = 'pym-admin:drafts';
export const UPLOADS_KEY = 'pym-admin:uploads';
export const PREVIEW_KEY = 'pym-admin:preview';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface StoredDraft {
  data: unknown;
  /** sha do arquivo no GitHub quando o rascunho começou */
  baseSha?: string;
}

export const readDrafts = () => read<Partial<Record<ContentFileId, StoredDraft>>>(DRAFTS_KEY, {});
export const readUploads = () => read<Record<string, string>>(UPLOADS_KEY, {});

export function isPreview(): boolean {
  try {
    return localStorage.getItem(PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPreview(on: boolean) {
  try {
    if (on) localStorage.setItem(PREVIEW_KEY, '1');
    else localStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* navegador sem armazenamento */
  }
}

/** Cópias originais dos arquivos antes da prévia aplicar os rascunhos. */
export const pristine: Partial<Record<ContentFileId, unknown>> = {};
