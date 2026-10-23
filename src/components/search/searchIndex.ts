import { modules } from '@/app/modules';
import { recordPath } from '@/app/paths';
import { content } from '@/data/client';
import type { CollectionName, RecordBase } from '@/data/types';
import { normalize } from '@/lib/asset';
import site from '@/content/site.json';
import { libraryCategories } from '@/data/library';

/** Grupos na ordem em que aparecem nos resultados. */
export const groups = [
  { id: 'characters', label: 'Personagens' },
  { id: 'earths', label: 'Terras' },
  { id: 'events', label: 'Eventos' },
  { id: 'factions', label: 'Facções' },
  { id: 'news', label: 'Notícias' },
  { id: 'library', label: 'Biblioteca' },
  { id: 'locations', label: 'Mapas' },
  { id: 'fame', label: 'Fama' },
  { id: 'archive', label: 'Arquivo' },
] as const;

export type GroupId = (typeof groups)[number]['id'];

export interface SearchEntry {
  key: string;
  group: GroupId;
  title: string;
  subtitle?: string;
  code?: string;
  href: string;
  /** texto normalizado do título, para casar e destacar */
  nTitle: string;
  /** palavras do título normalizadas */
  words: string[];
  /** demais campos normalizados (resumo, tags, apelidos…) */
  nBody: string;
}

const collections: CollectionName[] = ['characters', 'earths', 'events', 'factions', 'news', 'library', 'fame'];

type AnyRecord = RecordBase & Record<string, unknown>;

function entry(partial: Omit<SearchEntry, 'nTitle' | 'words' | 'nBody'> & { body?: string[] }): SearchEntry {
  const nTitle = normalize(partial.title);
  const { body = [], ...rest } = partial;
  return {
    ...rest,
    nTitle,
    words: nTitle.split(/[^a-z0-9]+/).filter(Boolean),
    nBody: normalize([partial.subtitle, partial.code, ...body].filter(Boolean).join(' ')),
  };
}

function subtitleFor(collection: CollectionName, record: AnyRecord): string | undefined {
  const pick = (k: string) => (typeof record[k] === 'string' ? (record[k] as string) : undefined);
  switch (collection) {
    case 'characters': {
      const codename = pick('codename');
      const alignment = pick('alignment');
      return [codename ? record.name : undefined, alignment && alignment.charAt(0).toUpperCase() + alignment.slice(1)]
        .filter(Boolean)
        .join(', ');
    }
    case 'library':
      return pick('group') ?? libraryCategories.find((c) => c.id === record.category)?.label;
    case 'fame':
      return pick('category');
    case 'events':
      return [pick('season'), pick('date')].filter(Boolean).join(', ') || pick('kind');
    default:
      return record.summary || undefined;
  }
}

let built: Promise<SearchEntry[]> | null = null;

/** Monta o índice uma vez, na primeira abertura da busca. */
export function loadIndex(): Promise<SearchEntry[]> {
  if (built) return built;
  built = (async () => {
    const entries: SearchEntry[] = [];

    const lists = await Promise.all(collections.map((c) => content.list(c)));
    lists.forEach((records, i) => {
      const collection = collections[i];
      for (const raw of records) {
        const record = raw as unknown as AnyRecord;
        const extra = ['name', 'codename', 'identity', 'race', 'code', 'category', 'kind', 'era', 'reason', 'description', 'body']
          .map((k) => record[k])
          .filter((v): v is string => typeof v === 'string');
        for (const k of ['aliases', 'lore', 'heroes', 'villains', 'organizations', 'characters', 'tags']) {
          const v = record[k];
          if (Array.isArray(v)) extra.push(...v.filter((x): x is string => typeof x === 'string'));
        }
        for (const k of ['tagline', 'season', 'date', 'statusNote']) {
          if (typeof record[k] === 'string') extra.push(record[k] as string);
        }
        if (Array.isArray(record.body)) {
          for (const b of record.body as unknown[]) {
            if (typeof b === 'string') extra.push(b);
            else if (b && typeof b === 'object') extra.push(...Object.values(b as Record<string, string>));
          }
        }
        entries.push(
          entry({
            key: `${collection}:${record.id}`,
            group: collection,
            title: (collection === 'characters' && typeof record.codename === 'string' && record.codename) || record.name,
            subtitle: subtitleFor(collection, record),
            code: typeof record.code === 'string' ? record.code : undefined,
            href: recordPath[collection](record.slug),
            body: [record.summary ?? '', ...(record.tags ?? []), ...extra],
          }),
        );
      }
    });

    for (const m of modules) {
      entries.push(
        entry({
          key: `module:${m.id}`,
          group: 'archive',
          title: m.label,
          subtitle: m.description,
          code: m.code,
          href: m.path,
          body: m.keywords,
        }),
      );
    }

    // Ala de Kamar-Taj: livros e feitiços (carregados só quando a busca abre)
    const magic = (await import('@/content/magic.json')).default as unknown as import('@/data/magic').MagicContent;
    entries.push(
      entry({
        key: 'wing:kamar-taj',
        group: 'library',
        title: 'Biblioteca de Kamar-Taj',
        subtitle: 'Ala mística: Núcleo de Mana, kit inicial e tomos recuperados.',
        href: '/biblioteca/kamar-taj',
        body: ['magia', 'mana', 'nucleo', 'grimorio', 'aprendiz', 'adepto', 'mathet', 'grao-mestre', 'corrupcao', magic.school.intro],
      }),
    );
    for (const b of magic.books) {
      entries.push(
        entry({
          key: `book:${b.id}`,
          group: 'library',
          title: b.title,
          subtitle: `${b.kind}, Kamar-Taj${b.pages?.length ? '' : ' (perdido na raid)'}`,
          href: `/biblioteca/kamar-taj?livro=${b.id}`,
          body: [b.summary ?? '', 'livro', 'tomo'],
        }),
      );
      for (const p of b.pages ?? []) {
        if (p.type !== 'feitiço') continue;
        entries.push(
          entry({
            key: `spell:${b.id}:${p.label}`,
            group: 'library',
            title: p.spell,
            subtitle: `Feitiço, ${b.title}`,
            href: `/biblioteca/kamar-taj?livro=${b.id}`,
            body: [p.title, p.description, 'feitiço', 'magia'],
          }),
        );
      }
    }

    // Mapa de PYM-City e modo Explorar
    const cityDocs = [
      (await import('@/content/city.json')).default,
      (await import('@/content/ascent.json')).default,
    ] as unknown as import('@/data/city').CityContent[];
    const world = (await import('@/content/world.json')).default as unknown as import('@/data/city').WorldContent;
    const loreText = (body?: unknown[]) =>
      (body ?? []).flatMap((b) => (typeof b === 'string' ? [b] : b && typeof b === 'object' ? Object.values(b as Record<string, string>) : []));
    for (const city of cityDocs) {
      const base = city.slug ? `/mapa/${city.slug}` : '/mapa';
      const layerName = new Map(city.layers.map((l) => [l.id, l.name]));
      const mapHref = (layer: string, slug?: string, sheet = false) => {
        const sp = new URLSearchParams();
        if (layer !== 'cidade') sp.set('camada', layer);
        if (slug) sp.set('local', slug);
        if (sheet) sp.set('ficha', 'camada');
        const qs = sp.toString();
        return `${base}${qs ? `?${qs}` : ''}`;
      };
      for (const l of city.layers) {
        entries.push(
          entry({
            key: `layer:${city.id}:${l.id}`,
            group: 'locations',
            title: l.name,
            subtitle: city.layers.length > 1 ? `${l.level}, ${city.name}` : 'Cidade',
            href: mapHref(l.id, undefined, true),
            body: [l.summary, l.tagline ?? '', city.summary, ...loreText(l.body)],
          }),
        );
      }
      for (const list of [city.districts, city.streets, city.places] as { id: string; slug: string; name: string; layer: string; kind: string; summary?: string; body?: unknown[]; draft?: boolean; canonical?: boolean }[][]) {
        for (const r of list) {
          if (r.draft) continue;
          const where = city.layers.length > 1 ? (layerName.get(r.layer as never) ?? city.name) : city.name;
          entries.push(
            entry({
              key: `city:${city.id}:${r.id}`,
              group: 'locations',
              title: r.name,
              subtitle: `${r.canonical ? 'Via canônica' : r.kind.charAt(0).toUpperCase() + r.kind.slice(1)}, ${where}`,
              href: mapHref(r.layer, r.slug),
              body: [r.summary ?? '', ...loreText(r.body), city.name, 'mapa'],
            }),
          );
        }
      }
    }
    for (const r of world.realms) {
      if (r.draft) continue;
      entries.push(
        entry({
          key: `realm:${r.id}`,
          group: 'locations',
          title: r.name,
          subtitle: `${r.kind}, ${r.region}`,
          href: `/mapa/explorar?local=${r.slug}`,
          body: [r.summary, ...loreText(r.body), 'explorar', 'mundo'],
        }),
      );
    }

    entries.push(
      entry({
        key: 'section:sobre',
        group: 'archive',
        title: 'O que é o PYM',
        subtitle: 'Guia da comunidade: origem, proposta e continuidade.',
        href: '/#sobre',
        body: [site.welcome, ...site.about.flatMap((s) => [s.title, ...s.paragraphs])],
      }),
      entry({
        key: 'section:diretrizes',
        group: 'archive',
        title: 'Diretrizes da comunidade',
        subtitle: 'Os objetivos que orientam o Roleplay no PYM.',
        href: '/#diretrizes',
        body: site.goals.flatMap((g) => [g.title, g.text]),
      }),
      entry({
        key: 'section:anthony',
        group: 'archive',
        title: site.anthony.name,
        subtitle: 'O símbolo da comunidade PYM.',
        href: '/#anthony',
        body: ['formiga', 'mascote', ...site.anthony.paragraphs],
      }),
      entry({
        key: 'link:discord',
        group: 'archive',
        title: 'Entrar no Discord',
        subtitle: 'discord.gg/xNjWzHdmvT',
        href: site.discordUrl,
        body: ['servidor', 'comunidade', 'convite'],
      }),
    );

    return entries;
  })();
  return built;
}

/* ── Pontuação ─────────────────────────────────────────────── */

/** Distância de edição limitada a 1 — tolera um erro de digitação. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function scoreToken(token: string, e: SearchEntry): number {
  if (e.nTitle === token) return 100;
  if (e.nTitle.startsWith(token)) return 80;
  if (e.words.some((w) => w.startsWith(token))) return 60;
  if (e.nTitle.includes(token)) return 45;
  if (e.code && normalize(e.code).includes(token)) return 45;
  if (token.length >= 4 && e.words.some((w) => withinOneEdit(token, w.slice(0, token.length + 1)) || withinOneEdit(token, w)))
    return 30;
  if (e.nBody.includes(token)) return 15;
  return 0;
}

export interface SearchHit extends SearchEntry {
  score: number;
}

export function search(index: SearchEntry[], query: string, perGroup = 6): SearchHit[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const hits: SearchHit[] = [];
  for (const e of index) {
    let total = 0;
    for (const t of tokens) {
      const s = scoreToken(t, e);
      if (!s) {
        total = 0;
        break;
      }
      total += s;
    }
    if (total) hits.push({ ...e, score: total });
  }

  hits.sort((a, b) => b.score - a.score);

  // Grupos ordenados pelo melhor resultado de cada um; empate segue a ordem fixa.
  const order = new Map(groups.map((g, i) => [g.id, i]));
  const best = new Map<GroupId, number>();
  for (const h of hits) if (!best.has(h.group)) best.set(h.group, h.score);

  const counts = new Map<GroupId, number>();
  return hits
    .filter((h) => {
      const n = counts.get(h.group) ?? 0;
      counts.set(h.group, n + 1);
      return n < perGroup;
    })
    .sort(
      (a, b) =>
        best.get(b.group)! - best.get(a.group)! ||
        order.get(a.group)! - order.get(b.group)! ||
        b.score - a.score,
    );
}
