import type { CollectionName, Collections } from './types';

/**
 * Contrato de acesso a dados.
 *
 * Hoje a implementação lê os JSON do repositório (`JsonRepository`).
 * Quando o painel administrativo entrar, basta criar outra classe com o mesmo
 * contrato (ex.: `SupabaseRepository`) e trocá-la em `src/data/index.ts`.
 * Nenhuma página precisa mudar.
 */
export interface ContentRepository {
  list<K extends CollectionName>(collection: K): Promise<Collections[K][]>;
  get<K extends CollectionName>(collection: K, slug: string): Promise<Collections[K] | undefined>;
  getById<K extends CollectionName>(collection: K, id: string): Promise<Collections[K] | undefined>;
}

type Loader = () => Promise<{ default: unknown[] }>;

/**
 * Cada coleção vira um pedaço separado do bundle e só é baixada quando
 * alguma página (ou a busca) precisa dela.
 */
const loaders: Record<CollectionName, Loader> = {
  earths: () => import('@/content/earths.json'),
  characters: () => import('@/content/characters.json'),
  factions: () => import('@/content/factions.json'),
  events: () => import('@/content/events.json'),
  news: () => import('@/content/news.json'),
  library: () => import('@/content/library.json'),
  fame: () => import('@/content/fame.json'),
};

export class JsonRepository implements ContentRepository {
  private cache = new Map<CollectionName, Promise<unknown[]>>();

  async list<K extends CollectionName>(collection: K): Promise<Collections[K][]> {
    let pending = this.cache.get(collection);
    if (!pending) {
      pending = loaders[collection]().then((mod) =>
        (mod.default as { draft?: boolean }[]).filter((record) => !record.draft),
      );
      this.cache.set(collection, pending);
    }
    return (await pending) as Collections[K][];
  }

  async get<K extends CollectionName>(collection: K, slug: string) {
    const records = await this.list(collection);
    return records.find((record) => record.slug === slug);
  }

  async getById<K extends CollectionName>(collection: K, id: string) {
    const records = await this.list(collection);
    return records.find((record) => record.id === id);
  }
}
