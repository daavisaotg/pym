import { useMemo } from 'react';
import { recordPath } from '@/app/paths';
import { characterTitle } from './labels';
import { useCollection } from './useCollection';

export interface RecordLink {
  id: string;
  label: string;
  href: string;
  /** Tipo do registro, para exibição */
  kind: string;
}

/** Índice de ids → links, para transformar referências em ligações clicáveis. */
export function useRecordLinks(): Map<string, RecordLink> {
  const { data: characters } = useCollection('characters');
  const { data: events } = useCollection('events');
  const { data: earths } = useCollection('earths');
  const { data: library } = useCollection('library');
  const { data: factions } = useCollection('factions');

  return useMemo(() => {
    const map = new Map<string, RecordLink>();
    map.set('kamar-taj', { id: 'kamar-taj', label: 'Biblioteca de Kamar-Taj', href: '/biblioteca/kamar-taj', kind: 'Ala mística' });
    for (const c of characters) map.set(c.id, { id: c.id, label: characterTitle(c), href: recordPath.characters(c.slug), kind: 'Personagem' });
    for (const e of events) map.set(e.id, { id: e.id, label: e.name, href: recordPath.events(e.slug), kind: e.season ?? 'Evento' });
    for (const e of earths) map.set(e.id, { id: e.id, label: e.name, href: recordPath.earths(e.slug), kind: 'Terra' });
    for (const f of factions) map.set(f.id, { id: f.id, label: f.name, href: recordPath.factions(f.slug), kind: 'Facção' });
    for (const l of library) map.set(l.id, { id: l.id, label: l.name, href: recordPath.library(l.slug), kind: 'Biblioteca' });
    return map;
  }, [characters, events, earths, library, factions]);
}
