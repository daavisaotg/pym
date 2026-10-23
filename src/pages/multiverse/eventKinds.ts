import type { EventKind } from '@/data/types';

export const kindLabel: Record<EventKind, string> = {
  temporada: 'Temporada',
  arco: 'Arco',
  guerra: 'Guerra',
  evento: 'Evento',
  histórico: 'Histórico',
  perdido: 'Registro perdido',
};

/** Filtros da linha do tempo, na ordem em que aparecem. */
export const kindFilters: { id: EventKind | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Tudo' },
  { id: 'temporada', label: 'Temporadas' },
  { id: 'arco', label: 'Arcos' },
  { id: 'guerra', label: 'Guerras' },
  { id: 'histórico', label: 'Históricos' },
  { id: 'perdido', label: 'Perdidos' },
];
