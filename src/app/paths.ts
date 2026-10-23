import type { CollectionName } from '@/data/types';

/** Onde cada tipo de registro mora no site. Usado por links e pela busca. */
export const recordPath: Record<CollectionName, (slug: string) => string> = {
  characters: (slug) => `/database/${slug}`,
  earths: (slug) => `/multiverso/${slug}`,
  events: (slug) => `/multiverso/eventos/${slug}`,
  factions: (slug) => `/faccoes/${slug}`,
  news: (slug) => `/noticias/${slug}`,
  library: (slug) => `/biblioteca/${slug}`,
  fame: (slug) => `/fama/${slug}`,
};
