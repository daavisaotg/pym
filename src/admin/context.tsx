import { createContext, useContext, useMemo } from 'react';
import type { CityContent } from '@/data/city';
import type { Option, RefSource } from './schema';
import { useAdmin } from './store';

export interface EditorEnv {
  refs: Record<RefSource, Option[]>;
  city?: CityContent;
  /** Nome do registro aberto, usado para nomear imagens enviadas */
  recordName: string;
}

const Ctx = createContext<EditorEnv | null>(null);
export const EditorProvider = Ctx.Provider;

export function useEditorEnv(): EditorEnv {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEditorEnv fora do editor');
  return v;
}

type Rec = Record<string, unknown>;
const list = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);
const s = (v: unknown) => (typeof v === 'string' ? v : '');

/** Opções de referência montadas a partir dos rascunhos atuais (registros novos já aparecem). */
export function useRefOptions(): Record<RefSource, Option[]> {
  const { files } = useAdmin();
  return useMemo(() => {
    const d = (id: keyof typeof files) => files[id]?.draft;
    const opt = (r: Rec, label: string): Option => ({ value: s(r.id), label: `${label} (${s(r.id)})` });
    const city = (d('city') ?? {}) as Rec;
    const ascent = (d('ascent') ?? {}) as Rec;
    const places = (c: Rec) =>
      [...list(c.districts), ...list(c.places), ...list(c.streets)].map((r) => ({ value: s(r.slug) || s(r.id), label: `${s(r.name)} (${s(r.slug) || s(r.id)})` }));
    const world = (d('world') ?? {}) as Rec;
    return {
      characters: list(d('characters')).map((r) => opt(r, s(r.codename) || s(r.name))),
      earths: list(d('earths')).map((r) => opt(r, s(r.name))),
      events: list(d('events')).map((r) => opt(r, s(r.name))),
      factions: list(d('factions')).map((r) => opt(r, s(r.name))),
      library: list(d('library')).map((r) => opt(r, s(r.name))),
      'kamar-taj': [{ value: 'kamar-taj', label: 'Biblioteca de Kamar-Taj (kamar-taj)' }],
      // No mapa, locais apontam por slug
      city: places(city),
      ascent: places(ascent),
      realms: list(world.realms).map((r) => opt(r, s(r.name))),
    };
  }, [files]);
}
