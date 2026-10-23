import { useSyncExternalStore } from 'react';
import {
  contentFileIds,
  contentFiles,
  DRAFTS_KEY,
  pristine,
  readDrafts,
  readUploads,
  UPLOADS_KEY,
  type ContentFileId,
  type StoredDraft,
} from '@/data/contentFiles';
import { sessionUploads } from '@/lib/asset';
import { commit, fileSha, readFile, verify, type CommitFile, type Connection } from './github';
import { clean, pretty } from './json';
import { makeZip, type ZipEntry } from './zip';

/**
 * Estado do painel: o conteúdo publicado (base), o rascunho de cada arquivo e a
 * conexão com o GitHub. Rascunhos e imagens novas ficam salvos neste navegador
 * até serem publicados ou descartados.
 */

export interface FileState {
  base: unknown;
  draft: unknown;
  /** sha do arquivo no GitHub, quando conectado */
  sha?: string;
  source: 'site' | 'github';
  /** O arquivo mudou no GitHub depois que o rascunho começou */
  conflict?: boolean;
}

export interface AdminState {
  ready: boolean;
  files: Partial<Record<ContentFileId, FileState>>;
  conn: Connection | null;
  /** Imagens novas: caminho em /public → data URL */
  uploads: Record<string, string>;
  busy?: string;
  error?: string;
  notice?: string;
  lastCommit?: { url: string; sha: string };
}

const CONN_KEY = 'pym-admin:conn';
const TOKEN_KEY = 'pym-admin:token';

let state: AdminState = { ready: false, files: {}, conn: null, uploads: {} };
const listeners = new Set<() => void>();

function set(patch: Partial<AdminState> | ((s: AdminState) => Partial<AdminState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach((l) => l());
}

export function useAdmin(): AdminState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const getState = () => state;

/* ── Persistência local ─────────────────────────────────────── */

let saveTimer = 0;
function persistDrafts() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    const out: Partial<Record<ContentFileId, StoredDraft>> = {};
    for (const id of contentFileIds) {
      const f = state.files[id];
      if (f && isDirty(f)) out[id] = { data: f.draft, baseSha: f.sha };
    }
    try {
      if (Object.keys(out).length) localStorage.setItem(DRAFTS_KEY, JSON.stringify(out));
      else localStorage.removeItem(DRAFTS_KEY);
    } catch {
      set({ error: 'O navegador não deixou salvar o rascunho (armazenamento cheio). Publique ou baixe as alterações.' });
    }
  }, 350);
}

function persistUploads() {
  try {
    if (Object.keys(state.uploads).length) localStorage.setItem(UPLOADS_KEY, JSON.stringify(state.uploads));
    else localStorage.removeItem(UPLOADS_KEY);
  } catch {
    set({ error: 'As imagens novas não couberam no armazenamento do navegador. Publique antes de recarregar a página.' });
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export const isDirty = (f?: FileState) => Boolean(f && !same(f.base, f.draft));
export const dirtyIds = (s: AdminState = state) => contentFileIds.filter((id) => isDirty(s.files[id]));

/* ── Carregamento ───────────────────────────────────────────── */

function readConnection(): Connection | null {
  try {
    const raw = localStorage.getItem(CONN_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Omit<Connection, 'token'>;
    const token = sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY);
    return token ? { ...c, token } : null;
  } catch {
    return null;
  }
}

/** Repositório salvo, mesmo sem token (para preencher o formulário). */
export function savedRepo(): Partial<Connection> {
  try {
    return JSON.parse(localStorage.getItem(CONN_KEY) ?? '{}') as Partial<Connection>;
  } catch {
    return {};
  }
}

let started = false;
export async function init() {
  if (started) return;
  started = true;
  const stored = readDrafts();
  const files: AdminState['files'] = {};
  await Promise.all(
    contentFileIds.map(async (id) => {
      const mod = (await contentFiles[id].load()) as { default: unknown };
      const base = structuredClone(pristine[id] ?? mod.default);
      const draft = stored[id] ? stored[id]!.data : structuredClone(base);
      files[id] = { base, draft, source: 'site' };
    }),
  );
  const uploads = readUploads();
  Object.assign(sessionUploads, uploads);
  set({ ready: true, files, uploads, conn: readConnection() });
  if (state.conn) await pullFromGitHub(stored);
}

/** Troca a base pelo que está publicado no GitHub agora. */
async function pullFromGitHub(stored: ReturnType<typeof readDrafts> = readDrafts()) {
  const c = state.conn;
  if (!c) return;
  set({ busy: 'Lendo o conteúdo publicado no GitHub…', error: undefined });
  try {
    const next: AdminState['files'] = { ...state.files };
    await Promise.all(
      contentFileIds.map(async (id) => {
        const { text, sha } = await readFile(c, contentFiles[id].path);
        const base = JSON.parse(text) as unknown;
        const prev = next[id]!;
        const hadDraft = Boolean(stored[id]) || isDirty(prev);
        next[id] = {
          base,
          draft: hadDraft ? prev.draft : structuredClone(base),
          sha,
          source: 'github',
          conflict: hadDraft && Boolean(stored[id]?.baseSha) && stored[id]!.baseSha !== sha,
        };
      }),
    );
    set({ files: next, busy: undefined });
  } catch (e) {
    set({ busy: undefined, error: `Não foi possível ler o repositório: ${(e as Error).message}` });
  }
}

/* ── Conexão ────────────────────────────────────────────────── */

export async function connect(c: Omit<Connection, 'user'>, remember: boolean) {
  set({ busy: 'Conferindo o acesso ao repositório…', error: undefined });
  try {
    const user = await verify(c);
    const conn: Connection = { ...c, user };
    localStorage.setItem(CONN_KEY, JSON.stringify({ owner: c.owner, repo: c.repo, branch: c.branch, user }));
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, c.token);
    set({ conn, busy: undefined, notice: `Conectado como ${user}.` });
    await pullFromGitHub();
    return true;
  } catch (e) {
    set({ busy: undefined, error: (e as Error).message });
    return false;
  }
}

export function disconnect() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  set({ conn: null, notice: 'Desconectado. Os rascunhos continuam salvos neste navegador.' });
}

/* ── Edição ─────────────────────────────────────────────────── */

export function update(id: ContentFileId, draft: unknown) {
  const f = state.files[id];
  if (!f) return;
  set({ files: { ...state.files, [id]: { ...f, draft } }, notice: undefined });
  persistDrafts();
}

export function discard(id: ContentFileId) {
  const f = state.files[id];
  if (!f) return;
  set({ files: { ...state.files, [id]: { ...f, draft: structuredClone(f.base), conflict: false } } });
  persistDrafts();
}

export function discardAll() {
  const files = { ...state.files };
  for (const id of contentFileIds) {
    const f = files[id];
    if (f) files[id] = { ...f, draft: structuredClone(f.base), conflict: false };
  }
  set({ files, uploads: {} });
  persistDrafts();
  persistUploads();
}

export function addUpload(path: string, dataUrl: string) {
  sessionUploads[path] = dataUrl;
  set({ uploads: { ...state.uploads, [path]: dataUrl } });
  persistUploads();
}

export function removeUpload(path: string) {
  const uploads = { ...state.uploads };
  delete uploads[path];
  delete sessionUploads[path];
  set({ uploads });
  persistUploads();
}

export const clearMessages = () => set({ error: undefined, notice: undefined });

/* ── Saída: GitHub ou .zip ──────────────────────────────────── */

function outputFiles(): { json: { id: ContentFileId; path: string; text: string }[]; images: { path: string; base64: string }[] } {
  const json = dirtyIds().map((id) => ({ id, path: contentFiles[id].path, text: pretty(clean(state.files[id]!.draft)) }));
  // Só envia imagens que algum arquivo ainda usa
  const all = JSON.stringify(contentFileIds.map((id) => state.files[id]?.draft));
  const images = Object.entries(state.uploads)
    .filter(([p]) => all.includes(`"${p}"`))
    .map(([p, url]) => ({ path: `public/${p}`, base64: url.slice(url.indexOf(',') + 1) }));
  return { json, images };
}

export async function publish(message: string) {
  const c = state.conn;
  if (!c) return false;
  const { json, images } = outputFiles();
  if (!json.length && !images.length) return false;
  set({ busy: 'Conferindo se alguém publicou antes de você…', error: undefined });
  try {
    for (const f of json) {
      const remote = await fileSha(c, f.path);
      if (remote && remote !== state.files[f.id]!.sha) {
        set({
          busy: undefined,
          error: `${f.path} mudou no GitHub depois que você abriu o painel. Recarregue a página para ver a versão nova (seu rascunho fica salvo).`,
        });
        return false;
      }
    }
    set({ busy: `Publicando ${json.length + images.length} arquivo(s)…` });
    const files: CommitFile[] = [
      ...json.map((f) => ({ path: f.path, content: f.text, encoding: 'utf-8' as const })),
      ...images.map((i) => ({ path: i.path, content: i.base64, encoding: 'base64' as const })),
    ];
    const result = await commit(c, files, message);
    // A versão publicada vira a nova base
    const next = { ...state.files };
    for (const f of json) {
      const sha = await fileSha(c, f.path).catch(() => undefined);
      const published = JSON.parse(f.text) as unknown;
      next[f.id] = { base: published, draft: structuredClone(published), sha: sha ?? undefined, source: 'github' };
    }
    set({ files: next, uploads: {}, busy: undefined, lastCommit: result, notice: 'Publicado. O site atualiza em 1 ou 2 minutos.' });
    persistDrafts();
    persistUploads();
    return true;
  } catch (e) {
    set({ busy: undefined, error: (e as Error).message });
    return false;
  }
}

export function exportZip() {
  const { json, images } = outputFiles();
  const enc = new TextEncoder();
  const entries: ZipEntry[] = [
    ...json.map((f) => ({ path: f.path, data: enc.encode(f.text) })),
    ...images.map((i) => ({ path: i.path, data: Uint8Array.from(atob(i.base64), (ch) => ch.charCodeAt(0)) })),
  ];
  return entries.length ? makeZip(entries) : null;
}

export function fileText(id: ContentFileId) {
  return pretty(clean(state.files[id]!.draft));
}
