import type { ContentFileId } from '@/data/contentFiles';

/**
 * Formulários do painel. Cada seção diz onde a lista (ou o objeto) mora dentro do
 * arquivo e quais campos mostrar. Campos que existem no JSON mas não estão aqui
 * aparecem em "Outros campos", editáveis do mesmo jeito.
 */

export type RefSource = 'characters' | 'earths' | 'events' | 'factions' | 'library' | 'kamar-taj' | 'city' | 'ascent' | 'realms';

export type Kind =
  | 'text'
  | 'textarea'
  | 'longtext'
  | 'number'
  | 'boolean'
  | 'select'
  | 'color'
  | 'image'
  | 'images'
  | 'strings'
  | 'ref'
  | 'refs'
  | 'nameref'
  | 'namerefs'
  | 'lore'
  | 'facts'
  | 'object'
  | 'list'
  | 'traits'
  | 'dict'
  | 'geo'
  | 'lonlat'
  | 'auto';

export interface Option {
  value: string;
  label: string;
}

export interface Field {
  key: string;
  label: string;
  kind: Kind;
  help?: string;
  options?: Option[];
  /** Subcampos (object e list) */
  fields?: Field[];
  /** De onde vêm as opções de ref/nameref */
  refs?: RefSource[];
  /** Só aparece quando o registro passa no teste */
  when?: (record: Record<string, unknown>) => boolean;
  required?: boolean;
  placeholder?: string;
  /** Pasta das imagens enviadas (dentro de public/uploads) */
  folder?: string;
  /** Formato da geometria: um ponto, uma linha ou uma área */
  geo?: 'point' | 'path' | 'polygon';
  /** Título de cada item de uma lista */
  itemTitle?: (item: Record<string, unknown>, i: number) => string;
  /** Item novo de uma lista */
  template?: () => unknown;
  /** Campo ocupa meia largura */
  half?: boolean;
  /** Chaves do dicionário (dict) */
  dictKeys?: Option[];
}

export interface Section {
  id: string;
  label: string;
  file: ContentFileId;
  /** Caminho da lista ou do objeto dentro do arquivo ([] = o arquivo inteiro) */
  path: string[];
  type: 'list' | 'object';
  fields: Field[];
  /** Grupo da barra lateral */
  group: string;
  /** Descrição curta da seção */
  hint?: string;
  titleOf?: (r: Record<string, unknown>) => string;
  subtitleOf?: (r: Record<string, unknown>) => string;
  template?: () => Record<string, unknown>;
  /** Chave usada como identificador (padrão: id) */
  idKey?: string;
  /** Campo de onde o id e o slug nascem (padrão: name) */
  nameKey?: string;
  /** Gera slug junto do id */
  slug?: boolean;
  /** A ordem da lista importa (mostra setas para mover) */
  ordered?: boolean;
  /** Link para ver o registro no site */
  viewHref?: (r: Record<string, unknown>) => string | undefined;
}

const opts = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/* ── Campos comuns ──────────────────────────────────────────── */

const ident = (refsLabel = 'Nome'): Field[] => [
  { key: 'name', label: refsLabel, kind: 'text', required: true },
  { key: 'id', label: 'ID', kind: 'text', required: true, half: true, help: 'Identificador fixo. Outros registros apontam para ele: evite mudar depois de publicado.' },
  { key: 'slug', label: 'Endereço (slug)', kind: 'text', required: true, half: true, help: 'Aparece na URL.' },
];

const summary: Field = { key: 'summary', label: 'Resumo', kind: 'textarea', help: 'Uma ou duas frases. Aparece em cartões e na busca.' };
const facts: Field = { key: 'facts', label: 'Outras informações', kind: 'facts' };
const draft: Field = { key: 'draft', label: 'Rascunho (esconder do site)', kind: 'boolean' };
const tags: Field = { key: 'tags', label: 'Palavras-chave da busca', kind: 'strings' };
const allRefs: RefSource[] = ['characters', 'events', 'earths', 'factions', 'library', 'kamar-taj'];

const alignment = opts('herói', 'vilão', 'anti-herói', 'neutro');
const recordStatus = opts('ativo', 'inativo', 'desaparecido', 'falecido', 'desconhecido', 'classificado');
const tiers: Option[] = [
  { value: 'humano', label: 'Humano' },
  { value: 'atletico', label: 'Atlético' },
  { value: 'sobre-humano', label: 'Sobre-humano' },
  { value: 'super', label: 'Super' },
  { value: 'super+', label: 'Super +' },
  { value: 'super++', label: 'Super ++' },
  { value: 'super+++', label: 'Super +++' },
  { value: 'mega', label: 'Mega' },
  { value: 'mega+', label: 'Mega +' },
];
const cityLayers: Option[] = [
  { value: 'superior', label: 'Cidade Superior' },
  { value: 'cidade', label: 'Cidade Principal' },
  { value: 'inferioridade', label: 'Inferioridade' },
  { value: 'campos', label: 'Campos' },
];

/** As cinco seções de uma cidade do mapa (PYM-City, Ascent City…). */
function citySections(file: 'city' | 'ascent', prefix: string, name: string, base: string, layers: Option[]): Section[] {
  const refSrc: RefSource = file;
  return [
    {
      id: `${prefix}-geral`,
      label: `${name}: geral e camadas`,
      group: 'Mapa',
      file,
      path: [],
      type: 'object',
      viewHref: () => base,
      fields: [
        { key: 'name', label: 'Nome da cidade', kind: 'text', half: true },
        { key: 'code', label: 'Código', kind: 'text', half: true },
        { key: 'tagline', label: 'Frase', kind: 'text' },
        summary,
        {
          key: 'layers',
          label: 'Camadas',
          kind: 'list',
          itemTitle: (l) => `${str(l.level)} · ${str(l.name)}`,
          fields: [
            { key: 'name', label: 'Nome', kind: 'text', half: true },
            { key: 'short', label: 'Nome curto (celular)', kind: 'text', half: true },
            { key: 'level', label: 'Nível', kind: 'text', half: true },
            { key: 'tagline', label: 'Frase', kind: 'text', half: true },
            { key: 'summary', label: 'Resumo', kind: 'textarea' },
            { key: 'ruler', label: 'Quem manda', kind: 'nameref', refs: ['characters', 'factions'], half: true },
            { key: 'rulerLabel', label: 'Rótulo de quem manda', kind: 'text', half: true },
            { key: 'body', label: 'Lore', kind: 'lore' },
            { key: 'images', label: 'Fotos', kind: 'images', folder: 'mapa' },
            facts,
          ],
        },
      ],
    },
    {
      id: `${prefix}-bairros`,
      label: `${name}: bairros e áreas`,
      group: 'Mapa',
      file,
      path: ['districts'],
      type: 'list',
      slug: true,
      titleOf: (r) => str(r.name),
      subtitleOf: (r) => `${str(r.kind)} · ${layers.find((l) => l.value === r.layer)?.label ?? ''}`,
      template: () => ({ layer: 'cidade', kind: 'Bairro', tone: 'neutro', shape: [[700, 450], [800, 450], [800, 520], [700, 520]] }),
      viewHref: (r) => `${base}?${r.layer !== 'cidade' ? `camada=${str(r.layer)}&` : ''}local=${str(r.slug)}`,
      fields: [
        ...ident(),
        { key: 'layer', label: 'Camada', kind: 'select', options: layers, half: true, required: true },
        { key: 'kind', label: 'Tipo', kind: 'text', half: true, placeholder: 'Bairro, Parque, Plataforma' },
        { key: 'tone', label: 'Cor da área', kind: 'select', half: true, options: opts('neutro', 'vermelho', 'verde', 'ouro', 'areia', 'sombra', 'tecnologia', 'agua') },
        { key: 'ruler', label: 'Quem manda', kind: 'nameref', refs: ['characters', 'factions'], half: true },
        { key: 'shape', label: 'Contorno no mapa', kind: 'geo', geo: 'polygon' },
        summary,
        { key: 'body', label: 'Lore', kind: 'lore' },
        { key: 'images', label: 'Fotos', kind: 'images', folder: 'mapa' },
        facts,
        { key: 'related', label: 'Registros ligados', kind: 'refs', refs: allRefs },
        draft,
      ],
    },
    {
      id: `${prefix}-ruas`,
      label: `${name}: ruas e vias`,
      group: 'Mapa',
      file,
      path: ['streets'],
      type: 'list',
      slug: true,
      titleOf: (r) => str(r.name),
      subtitleOf: (r) => `${r.canonical ? 'canônica · ' : ''}${str(r.kind)} · ${layers.find((l) => l.value === r.layer)?.label ?? ''}`,
      template: () => ({ layer: 'cidade', kind: 'rua', path: [[600, 300], [900, 300]] }),
      viewHref: (r) => `${base}?${r.layer !== 'cidade' ? `camada=${str(r.layer)}&` : ''}local=${str(r.slug)}`,
      fields: [
        ...ident('Nome da rua'),
        { key: 'layer', label: 'Camada', kind: 'select', options: layers, half: true, required: true },
        { key: 'kind', label: 'Tipo', kind: 'select', half: true, options: opts('rua', 'avenida', 'via elevada', 'túnel', 'estrada', 'galeria', 'beco', 'trilha', 'ponte') },
        { key: 'canonical', label: 'Rua canônica (destaque em vermelho)', kind: 'boolean' },
        { key: 'path', label: 'Traçado no mapa', kind: 'geo', geo: 'path' },
        summary,
        { key: 'body', label: 'Texto', kind: 'lore' },
        { key: 'images', label: 'Fotos', kind: 'images', folder: 'mapa' },
        facts,
        { key: 'related', label: 'Registros ligados', kind: 'refs', refs: allRefs },
        draft,
      ],
    },
    {
      id: `${prefix}-locais`,
      label: `${name}: prédios e locais`,
      group: 'Mapa',
      file,
      path: ['places'],
      type: 'list',
      slug: true,
      titleOf: (r) => str(r.name),
      subtitleOf: (r) => `${str(r.kind)} · ${layers.find((l) => l.value === r.layer)?.label ?? ''}`,
      template: () => ({ layer: 'cidade', kind: 'Prédio', icon: 'ponto', at: [800, 500] }),
      viewHref: (r) => `${base}?${r.layer !== 'cidade' ? `camada=${str(r.layer)}&` : ''}local=${str(r.slug)}`,
      fields: [
        ...ident('Nome do prédio ou local'),
        { key: 'layer', label: 'Camada', kind: 'select', options: layers, half: true, required: true },
        { key: 'kind', label: 'Tipo', kind: 'text', half: true, placeholder: 'Bar, Delegacia, Torre' },
        {
          key: 'icon',
          label: 'Ícone',
          kind: 'select',
          half: true,
          options: [
            { value: 'ponto', label: 'Ponto' },
            { value: 'torre', label: 'Torre ou prédio' },
            { value: 'bar', label: 'Bar' },
            { value: 'escudo', label: 'Escudo (governo, polícia)' },
            { value: 'antena', label: 'Antena' },
            { value: 'portao', label: 'Portão' },
            { value: 'portal', label: 'Túnel ou portal' },
            { value: 'acesso', label: 'Bueiro ou acesso' },
            { value: 'cruz', label: 'Cruz' },
            { value: 'onda', label: 'Água' },
          ],
        },
        { key: 'district', label: 'Bairro', kind: 'ref', refs: [refSrc], half: true },
        { key: 'at', label: 'Posição no mapa', kind: 'geo', geo: 'point' },
        { key: 'leadsTo', label: 'Leva a outra camada', kind: 'select', options: layers, half: true, help: 'Para túneis, bueiros e elevadores.' },
        {
        key: 'leadsToCity',
        label: 'Leva a outra cidade',
        kind: 'select',
        half: true,
        options: [
          { value: 'pym-city', label: 'PYM-City' },
          { value: 'ascent', label: 'Ascent City' },
        ],
      },
      { key: 'owner', label: 'Dono ou responsável', kind: 'nameref', refs: ['characters', 'factions'], half: true },
        { key: 'ownerLabel', label: 'Rótulo do dono', kind: 'text', half: true, placeholder: 'Dono' },
        summary,
        { key: 'body', label: 'Texto', kind: 'lore' },
        { key: 'images', label: 'Fotos', kind: 'images', folder: 'mapa' },
        facts,
        { key: 'related', label: 'Registros ligados', kind: 'refs', refs: allRefs },
        draft,
      ],
    },
    {
      id: `${prefix}-fatos`,
      label: `${name}: fatos da seta`,
      group: 'Mapa',
      file,
      path: ['facts'],
      type: 'list',
      idKey: 'title',
      ordered: true,
      hint: 'Os fatos que abrem na seta do canto superior direito do mapa.',
      titleOf: (r) => str(r.title),
      subtitleOf: (r) => str(r.text).slice(0, 60),
      template: () => ({ title: 'Novo fato', text: '' }),
      fields: [
        { key: 'title', label: 'Título', kind: 'text', required: true },
        { key: 'text', label: 'Texto', kind: 'textarea', required: true },
        { key: 'local', label: 'Mostrar no mapa', kind: 'ref', refs: [refSrc], half: true },
        { key: 'ref', label: 'Registro do arquivo', kind: 'ref', refs: allRefs, half: true },
      ],
    },
  ];
}

/* ── Seções ─────────────────────────────────────────────────── */

export const sections: Section[] = [
  {
    id: 'personagens',
    label: 'Personagens',
    group: 'Arquivo',
    file: 'characters',
    path: [],
    type: 'list',
    slug: true,
    hint: 'Fichas do Database.',
    titleOf: (r) => str(r.codename) || str(r.name),
    subtitleOf: (r) => [str(r.codename) ? str(r.name) : '', str(r.alignment)].filter(Boolean).join(' · '),
    template: () => ({ alignment: 'herói', status: 'ativo', earth: 'terra-001' }),
    viewHref: (r) => `/database/${str(r.slug)}`,
    fields: [
      ...ident('Nome civil ou principal'),
      { key: 'codename', label: 'Codinome', kind: 'text', half: true, help: 'Título da ficha (ex.: Superman).' },
      { key: 'code', label: 'Código do registro', kind: 'text', half: true, placeholder: 'DB-0003' },
      { key: 'identity', label: 'Identidade civil', kind: 'text', half: true },
      { key: 'player', label: 'Jogador no Discord', kind: 'text', half: true },
      { key: 'aliases', label: 'Outros apelidos', kind: 'strings' },
      { key: 'image', label: 'Foto principal', kind: 'image', folder: 'personagens' },
      summary,
      { key: 'description', label: 'Descrição', kind: 'textarea' },
      { key: 'alignment', label: 'Lado', kind: 'select', options: alignment, half: true, required: true },
      { key: 'alignmentNote', label: 'Complemento do lado', kind: 'text', half: true },
      { key: 'status', label: 'Situação', kind: 'select', options: recordStatus, half: true, required: true },
      { key: 'earth', label: 'Terra', kind: 'ref', refs: ['earths'], half: true, required: true },
      { key: 'factions', label: 'Facções', kind: 'refs', refs: ['factions'] },
      { key: 'age', label: 'Idade', kind: 'text', half: true },
      { key: 'gender', label: 'Gênero', kind: 'text', half: true },
      { key: 'height', label: 'Altura', kind: 'text', half: true },
      { key: 'weight', label: 'Peso', kind: 'text', half: true },
      { key: 'sexuality', label: 'Sexualidade', kind: 'text', half: true },
      { key: 'race', label: 'Raça', kind: 'text', half: true },
      { key: 'history', label: 'História', kind: 'longtext' },
      {
        key: 'stats',
        label: 'Status',
        kind: 'list',
        itemTitle: (s) => `${str(s.attribute)}: ${tiers.find((t) => t.value === s.tier)?.label ?? str(s.tier)}`,
        template: () => ({ attribute: 'forca', tier: 'humano' }),
        fields: [
          {
            key: 'attribute',
            label: 'Atributo',
            kind: 'select',
            half: true,
            options: [
              { value: 'forca', label: 'Força' },
              { value: 'velocidade', label: 'Velocidade' },
              { value: 'durabilidade', label: 'Durabilidade' },
              { value: 'resistencia', label: 'Resistência' },
            ],
          },
          { key: 'tier', label: 'Nível', kind: 'select', options: tiers, half: true },
          { key: 'note', label: 'Observação', kind: 'text' },
        ],
      },
      { key: 'powers', label: 'Poderes', kind: 'traits' },
      { key: 'abilities', label: 'Habilidades', kind: 'traits' },
      { key: 'weaknesses', label: 'Fraquezas', kind: 'strings' },
      { key: 'personality', label: 'Personalidade', kind: 'strings' },
      { key: 'equipment', label: 'Equipamentos', kind: 'strings' },
      { key: 'rivals', label: 'Rivais', kind: 'namerefs', refs: ['characters'] },
      {
        key: 'relations',
        label: 'Relações',
        kind: 'list',
        itemTitle: (r) => [str(r.name), str(r.role)].filter(Boolean).join(' · '),
        template: () => ({ name: '', kind: 'pessoa' }),
        fields: [
          { key: 'name', label: 'Nome', kind: 'text', half: true },
          { key: 'role', label: 'Papel ou vínculo', kind: 'text', half: true },
          { key: 'kind', label: 'Tipo', kind: 'select', options: opts('pessoa', 'organização'), half: true },
          { key: 'ref', label: 'Registro ligado', kind: 'ref', refs: ['characters', 'factions'], half: true },
        ],
      },
      {
        key: 'fame',
        label: 'Fama',
        kind: 'list',
        itemTitle: (f) => `${str(f.place)}: ${f.score ?? '?'}/10`,
        template: () => ({ place: 'Terra', score: 5 }),
        fields: [
          { key: 'place', label: 'Onde', kind: 'text', half: true },
          { key: 'score', label: 'Nota (0 a 10)', kind: 'number', half: true },
          { key: 'as', label: 'Como (identidade)', kind: 'text', half: true },
          { key: 'note', label: 'Observação', kind: 'text', half: true },
        ],
      },
      {
        key: 'gallery',
        label: 'Galeria',
        kind: 'list',
        itemTitle: (g) => str(g.caption) || str(g.src),
        template: () => ({ src: '' }),
        fields: [
          { key: 'src', label: 'Imagem', kind: 'image', folder: 'personagens' },
          { key: 'caption', label: 'Legenda', kind: 'text' },
        ],
      },
      facts,
      tags,
      draft,
    ],
  },
  {
    id: 'terras',
    label: 'Terras',
    group: 'Arquivo',
    file: 'earths',
    path: [],
    type: 'list',
    slug: true,
    hint: 'Realidades do mapa do Multiverso.',
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => `${str(r.code)} · ${str(r.status)}`,
    template: () => ({ code: 'TERRA-', status: 'estável', visual: { theme: 'desconhecido', size: 40, position: [0, 0] } }),
    viewHref: (r) => `/multiverso/${str(r.slug)}`,
    fields: [
      ...ident(),
      { key: 'code', label: 'Código', kind: 'text', half: true, placeholder: 'TERRA-616' },
      { key: 'status', label: 'Estado', kind: 'select', half: true, options: opts('estável', 'ameaçada', 'instável', 'unificada', 'em colapso', 'destruída', 'isolada', 'desconhecido') },
      { key: 'statusNote', label: 'Complemento do estado', kind: 'text' },
      { key: 'aliases', label: 'Outros nomes', kind: 'strings' },
      summary,
      { key: 'lore', label: 'Lore', kind: 'strings', help: 'Um parágrafo por item.' },
      { key: 'heroes', label: 'Heróis', kind: 'namerefs', refs: ['characters'] },
      { key: 'villains', label: 'Vilões', kind: 'namerefs', refs: ['characters'] },
      { key: 'organizations', label: 'Organizações', kind: 'namerefs', refs: ['factions'] },
      {
        key: 'connections',
        label: 'Conexões no mapa',
        kind: 'list',
        itemTitle: (c) => `→ ${str(c.to)}`,
        template: () => ({ to: '' }),
        fields: [
          { key: 'to', label: 'Terra', kind: 'ref', refs: ['earths'], half: true },
          { key: 'event', label: 'Evento que criou a ligação', kind: 'ref', refs: ['events'], half: true },
          { key: 'label', label: 'Texto da ligação', kind: 'text' },
        ],
      },
      {
        key: 'visual',
        label: 'Aparência no mapa',
        kind: 'object',
        fields: [
          { key: 'theme', label: 'Tema do planeta', kind: 'select', half: true, options: opts('arquivo', 'ultimate', 'desconhecido', 'brasa', 'gelo', 'vazio') },
          { key: 'size', label: 'Tamanho (raio)', kind: 'number', half: true },
          { key: 'position', label: 'Posição [x, y] (0,0 é o centro)', kind: 'auto' },
          { key: 'seed', label: 'Semente da textura', kind: 'number', half: true },
        ],
      },
      { key: 'hasMap', label: 'Tem mapa próprio publicado', kind: 'boolean', half: true },
      { key: 'mapName', label: 'Nome do mapa', kind: 'text', half: true },
      facts,
      draft,
    ],
  },
  {
    id: 'linha-do-tempo',
    label: 'Linha do tempo',
    group: 'Arquivo',
    file: 'events',
    path: [],
    type: 'list',
    slug: true,
    hint: 'Temporadas, arcos, guerras e registros perdidos.',
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => [str(r.season) || str(r.kind), str(r.date)].filter(Boolean).join(' · '),
    template: () => ({ kind: 'arco', order: 100, earths: ['terra-001'] }),
    viewHref: (r) => `/multiverso/eventos/${str(r.slug)}`,
    fields: [
      ...ident('Título'),
      { key: 'kind', label: 'Tipo', kind: 'select', half: true, options: opts('temporada', 'arco', 'guerra', 'evento', 'histórico', 'perdido') },
      { key: 'order', label: 'Posição na linha do tempo', kind: 'number', half: true, help: 'Menor vem antes.' },
      { key: 'season', label: 'Temporada', kind: 'text', half: true, placeholder: 'Temporada 13' },
      { key: 'date', label: 'Data', kind: 'text', half: true, placeholder: '01/01/2033' },
      { key: 'timeskip', label: 'Time-skip', kind: 'text', half: true },
      { key: 'current', label: 'Em andamento no RP', kind: 'boolean', half: true },
      { key: 'tagline', label: 'Frase de abertura', kind: 'text' },
      summary,
      { key: 'earths', label: 'Terras envolvidas', kind: 'refs', refs: ['earths'] },
      { key: 'characters', label: 'Personagens', kind: 'namerefs', refs: ['characters'] },
      { key: 'factions', label: 'Facções', kind: 'refs', refs: ['factions'] },
      {
        key: 'milestones',
        label: 'Marcos',
        kind: 'list',
        itemTitle: (m) => [str(m.date), str(m.label)].filter(Boolean).join(' · '),
        template: () => ({ label: '' }),
        fields: [
          { key: 'date', label: 'Data', kind: 'text', half: true },
          { key: 'label', label: 'Marco', kind: 'text' },
        ],
      },
      { key: 'body', label: 'Lore', kind: 'lore' },
      draft,
    ],
  },
  {
    id: 'faccoes',
    label: 'Facções',
    group: 'Arquivo',
    file: 'factions',
    path: [],
    type: 'list',
    slug: true,
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => str(r.classification),
    template: () => ({ color: '#8a0303', earth: 'terra-001' }),
    viewHref: (r) => `/faccoes/${str(r.slug)}`,
    fields: [
      ...ident(),
      { key: 'acronym', label: 'Sigla do brasão', kind: 'text', half: true },
      { key: 'color', label: 'Cor', kind: 'color', half: true },
      { key: 'logo', label: 'Logo oficial', kind: 'image', folder: 'faccoes', help: 'Sem logo, o site gera um brasão com a sigla.' },
      { key: 'classification', label: 'Classificação', kind: 'text', half: true },
      { key: 'motto', label: 'Lema', kind: 'text', half: true },
      { key: 'earth', label: 'Terra', kind: 'ref', refs: ['earths'], half: true },
      summary,
      { key: 'body', label: 'Texto', kind: 'lore' },
      { key: 'goals', label: 'Objetivos', kind: 'strings' },
      { key: 'leaders', label: 'Liderança', kind: 'namerefs', refs: ['characters'] },
      { key: 'figures', label: 'Outras figuras', kind: 'namerefs', refs: ['characters'] },
      { key: 'members', label: 'Membros do Database', kind: 'refs', refs: ['characters'] },
      { key: 'bases', label: 'Bases', kind: 'strings' },
      { key: 'allies', label: 'Aliados', kind: 'namerefs', refs: ['factions'] },
      { key: 'enemies', label: 'Inimigos', kind: 'namerefs', refs: ['factions'] },
      { key: 'events', label: 'Eventos', kind: 'refs', refs: ['events'] },
      { key: 'related', label: 'Verbetes ligados', kind: 'refs', refs: ['library'] },
      facts,
      draft,
    ],
  },
  {
    id: 'fama',
    label: 'Hall da Fama',
    group: 'Arquivo',
    file: 'fame',
    path: [],
    type: 'list',
    slug: true,
    hint: 'Cada homenagem ocupa uma estrela da constelação de Anthony.',
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => [str(r.category), r.star !== undefined ? `estrela ${r.star}` : ''].filter(Boolean).join(' · '),
    template: () => ({ category: 'Jogador', reason: '' }),
    viewHref: () => '/fama',
    fields: [
      ...ident('Homenageado'),
      { key: 'category', label: 'Categoria', kind: 'text', half: true, placeholder: 'Jogador, Narrador, Staff' },
      { key: 'star', label: 'Estrela (0 a 12)', kind: 'number', half: true, help: '6 e 7 são os olhos, 10 o queixo, 0 e 3 as antenas.' },
      { key: 'reason', label: 'Motivo', kind: 'textarea', required: true },
      { key: 'description', label: 'Texto', kind: 'textarea' },
      { key: 'period', label: 'Período', kind: 'text', half: true },
      { key: 'character', label: 'Personagem', kind: 'ref', refs: ['characters'], half: true },
      { key: 'image', label: 'Foto', kind: 'image', folder: 'fama' },
      draft,
    ],
  },
  {
    id: 'noticias',
    label: 'Notícias',
    group: 'Arquivo',
    file: 'news',
    path: [],
    type: 'list',
    slug: true,
    hint: 'Comunicados do servidor (a página de notícias ainda não está no ar).',
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => str(r.publishedAt),
    template: () => ({ publishedAt: new Date().toISOString().slice(0, 10), body: '' }),
    fields: [
      ...ident('Título'),
      { key: 'publishedAt', label: 'Data', kind: 'text', half: true, placeholder: 'AAAA-MM-DD' },
      { key: 'author', label: 'Autor', kind: 'text', half: true },
      { key: 'image', label: 'Imagem', kind: 'image', folder: 'noticias' },
      summary,
      { key: 'body', label: 'Texto', kind: 'longtext' },
      { key: 'related', label: 'Registros ligados', kind: 'refs', refs: allRefs },
      draft,
    ],
  },

  /* Biblioteca */
  {
    id: 'verbetes',
    label: 'Verbetes',
    group: 'Biblioteca',
    file: 'library',
    path: [],
    type: 'list',
    slug: true,
    hint: 'Artefatos, raças, pactos, tropas, simbiontes.',
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => [str(r.category), str(r.group), r.pending ? 'pendente' : ''].filter(Boolean).join(' · '),
    template: () => ({ category: 'artefatos' }),
    viewHref: (r) => `/biblioteca/${str(r.slug)}`,
    fields: [
      ...ident(),
      { key: 'category', label: 'Categoria', kind: 'select', half: true, options: opts('artefatos', 'raças', 'pactos', 'tropas', 'simbiontes', 'magias', 'tecnologias', 'dimensões') },
      { key: 'group', label: 'Subtipo', kind: 'text', half: true, placeholder: 'Pacto, Maldição, Força cósmica' },
      { key: 'image', label: 'Imagem', kind: 'image', folder: 'biblioteca', help: 'Sem imagem, o verbete ganha um selo gerado.' },
      summary,
      { key: 'body', label: 'Texto', kind: 'lore' },
      facts,
      { key: 'earths', label: 'Terras', kind: 'refs', refs: ['earths'] },
      { key: 'related', label: 'Registros ligados', kind: 'refs', refs: allRefs },
      { key: 'pending', label: 'Sem texto oficial ainda', kind: 'boolean' },
      tags,
      draft,
    ],
  },
  {
    id: 'kamar-taj-livros',
    label: 'Kamar-Taj: livros',
    group: 'Biblioteca',
    file: 'magic',
    path: ['books'],
    type: 'list',
    nameKey: 'title',
    hint: 'Livros das estantes e suas páginas.',
    titleOf: (r) => str(r.title),
    subtitleOf: (r) => {
      const pages = Array.isArray(r.pages) ? r.pages.length : 0;
      return `${str(r.shelf)} · ${pages ? `${pages} páginas` : 'perdido'}`;
    },
    template: () => ({ kind: 'Grimório', shelf: 'aprendiz' }),
    viewHref: (r) => `/biblioteca/kamar-taj?livro=${str(r.id)}`,
    fields: [
      { key: 'title', label: 'Título', kind: 'text', required: true },
      { key: 'id', label: 'ID', kind: 'text', required: true, half: true },
      { key: 'kind', label: 'Tipo', kind: 'text', half: true, placeholder: 'Grimório, Tomo, Códice' },
      { key: 'shelf', label: 'Estante', kind: 'select', half: true, options: opts('aprendiz', 'adepto', 'mathet', 'grao-mestre', 'universal') },
      { key: 'classification', label: 'Classificação escrita no livro', kind: 'text', half: true },
      { key: 'color', label: 'Cor da lombada', kind: 'color', half: true },
      summary,
      {
        key: 'pages',
        label: 'Páginas',
        kind: 'list',
        help: 'Livros com páginas brilham na estante e podem ser folheados.',
        itemTitle: (p, i) => {
          const t = str(p.type);
          const name = t === 'feitiço' ? str(p.spell) || str(p.title) : str(p.title) || str(p.label);
          return `${i + 1}. ${t}${name ? `: ${name}` : ''}${p.restored ? ' (restaurada)' : ''}`;
        },
        template: () => ({ type: 'feitiço', label: '', title: '', spell: '', description: '', mana: '' }),
        fields: [
          { key: 'type', label: 'Tipo de página', kind: 'select', half: true, options: opts('feitiço', 'texto', 'rasgada', 'borrada') },
          { key: 'label', label: 'Rótulo', kind: 'text', half: true, placeholder: 'Capítulo 03', when: (p) => p.type !== 'texto' },
          { key: 'title', label: 'Título', kind: 'text', when: (p) => p.type === 'feitiço' || p.type === 'texto' },
          { key: 'quote', label: 'Citação', kind: 'textarea', when: (p) => p.type === 'feitiço' },
          { key: 'spell', label: 'Nome do feitiço', kind: 'text', half: true, when: (p) => p.type === 'feitiço' },
          { key: 'mana', label: 'Custo de Mana', kind: 'text', half: true, when: (p) => p.type === 'feitiço' },
          { key: 'description', label: 'Descrição', kind: 'textarea', when: (p) => p.type === 'feitiço' },
          { key: 'image', label: 'Ilustração', kind: 'image', folder: 'kamar-taj', when: (p) => p.type === 'feitiço' },
          { key: 'blocks', label: 'Texto', kind: 'lore', when: (p) => p.type === 'texto' },
          { key: 'facts', label: 'Dados', kind: 'facts', when: (p) => p.type === 'texto' },
          { key: 'note', label: 'Nota da página', kind: 'text', when: (p) => p.type === 'rasgada' || p.type === 'borrada' },
          { key: 'restored', label: 'Restaurada (aguarda revisão da staff)', kind: 'boolean', when: (p) => p.type === 'feitiço' || p.type === 'texto' },
        ],
      },
    ],
  },
  {
    id: 'kamar-taj-escola',
    label: 'Kamar-Taj: Ordem e regras',
    group: 'Biblioteca',
    file: 'magic',
    path: [],
    type: 'object',
    viewHref: () => '/biblioteca/kamar-taj',
    fields: [
      {
        key: 'school',
        label: 'A Ordem',
        kind: 'object',
        fields: [
          { key: 'name', label: 'Nome', kind: 'text', half: true },
          { key: 'location', label: 'Local', kind: 'text', half: true },
          { key: 'intro', label: 'Apresentação', kind: 'textarea' },
          { key: 'protocol', label: 'Protocolo', kind: 'textarea' },
          { key: 'dimensions', label: 'Dimensões', kind: 'textarea' },
          { key: 'restrictions', label: 'Restrições', kind: 'strings' },
        ],
      },
      {
        key: 'library',
        label: 'A biblioteca',
        kind: 'object',
        fields: [
          { key: 'paragraphs', label: 'Parágrafos', kind: 'strings' },
          { key: 'credit', label: 'Crédito', kind: 'text' },
        ],
      },
      {
        key: 'kit',
        label: 'Kit inicial',
        kind: 'object',
        fields: [
          { key: 'intro', label: 'Apresentação', kind: 'textarea' },
          {
            key: 'items',
            label: 'Itens',
            kind: 'list',
            itemTitle: (i) => str(i.name),
            template: () => ({ name: '', text: '' }),
            fields: [
              { key: 'name', label: 'Nome', kind: 'text' },
              { key: 'text', label: 'Texto', kind: 'textarea' },
              { key: 'effect', label: 'Efeito', kind: 'text' },
            ],
          },
        ],
      },
      { key: 'system', label: 'Sistema de Mana', kind: 'auto', help: 'Graus, métodos de ganho, limites, caminhos e evolução corrompida.' },
    ],
  },

  /* Mapa */
  ...citySections('city', 'cidade', 'PYM-City', '/mapa', cityLayers),
  ...citySections('ascent', 'ascent', 'Ascent City', '/mapa/ascent', [{ value: 'cidade', label: 'Ascent City' }]),
  {
    id: 'explorar',
    label: 'Explorar: países e reinos',
    group: 'Mapa',
    file: 'world',
    path: ['realms'],
    type: 'list',
    slug: true,
    titleOf: (r) => str(r.name),
    subtitleOf: (r) => `${str(r.kind)} · ${str(r.region)}${r.reference ? ' · referência' : ''}`,
    template: () => ({ kind: 'Nação', region: '', coords: [0, 20], summary: '', reference: true }),
    viewHref: (r) => `/mapa/explorar?local=${str(r.slug)}`,
    fields: [
      ...ident(),
      { key: 'kind', label: 'Tipo', kind: 'text', half: true, placeholder: 'Reino, Nação, Ilha' },
      { key: 'region', label: 'Região', kind: 'text', half: true },
      { key: 'coords', label: 'Posição no mapa-múndi', kind: 'lonlat' },
      { key: 'labelSide', label: 'Lado do nome', kind: 'select', half: true, options: [{ value: 'right', label: 'Direita' }, { value: 'left', label: 'Esquerda' }, { value: 'below', label: 'Abaixo' }] },
      { key: 'reference', label: 'Texto de referência do cânone', kind: 'boolean', half: true },
      { key: 'summary', label: 'Resumo', kind: 'textarea', required: true },
      { key: 'ruler', label: 'Governo', kind: 'nameref', refs: ['characters', 'factions'], half: true },
      { key: 'capital', label: 'Capital', kind: 'text', half: true },
      { key: 'body', label: 'Texto', kind: 'lore' },
      { key: 'images', label: 'Fotos', kind: 'images', folder: 'mapa' },
      facts,
      { key: 'related', label: 'Registros ligados', kind: 'refs', refs: allRefs },
      {
        key: 'link',
        label: 'Botão extra',
        kind: 'object',
        fields: [
          { key: 'label', label: 'Texto do botão', kind: 'text', half: true },
          { key: 'href', label: 'Endereço no site', kind: 'text', half: true, placeholder: '/mapa' },
        ],
      },
      draft,
    ],
  },

  /* Site */
  {
    id: 'home',
    label: 'Home e textos do site',
    group: 'Site',
    file: 'site',
    path: [],
    type: 'object',
    viewHref: () => '/',
    fields: [
      { key: 'name', label: 'Nome', kind: 'text', half: true },
      { key: 'title', label: 'Título da Home', kind: 'text', half: true },
      { key: 'description', label: 'Descrição (SEO)', kind: 'textarea' },
      { key: 'genre', label: 'Gênero', kind: 'text', half: true },
      { key: 'platform', label: 'Plataforma', kind: 'text', half: true },
      { key: 'foundedYear', label: 'Ano de fundação', kind: 'number', half: true },
      { key: 'discordUrl', label: 'Convite do Discord', kind: 'text', half: true },
      { key: 'welcome', label: 'Boas-vindas', kind: 'textarea' },
      {
        key: 'about',
        label: 'O que é o PYM (capítulos)',
        kind: 'list',
        itemTitle: (c) => str(c.title),
        template: () => ({ id: 'novo', title: '', paragraphs: [] }),
        fields: [
          { key: 'title', label: 'Título', kind: 'text', half: true },
          { key: 'id', label: 'ID (âncora)', kind: 'text', half: true },
          { key: 'paragraphs', label: 'Parágrafos', kind: 'strings' },
        ],
      },
      {
        key: 'goals',
        label: 'Diretrizes',
        kind: 'list',
        itemTitle: (g) => str(g.title),
        template: () => ({ title: '', text: '' }),
        fields: [
          { key: 'title', label: 'Título', kind: 'text' },
          { key: 'text', label: 'Texto', kind: 'textarea' },
        ],
      },
      {
        key: 'anthony',
        label: 'Anthony',
        kind: 'object',
        fields: [
          { key: 'name', label: 'Nome', kind: 'text' },
          { key: 'paragraphs', label: 'Parágrafos', kind: 'strings' },
          { key: 'closing', label: 'Fecho', kind: 'text' },
        ],
      },
    ],
  },
  {
    id: 'status',
    label: 'Escala de status',
    group: 'Site',
    file: 'status',
    path: [],
    type: 'object',
    viewHref: () => '/database',
    fields: [
      { key: 'intro', label: 'Introdução', kind: 'textarea' },
      { key: 'warning', label: 'Aviso', kind: 'textarea' },
      {
        key: 'tiers',
        label: 'Níveis',
        kind: 'list',
        help: 'A ordem da lista é a ordem da escala. Não mude os IDs: as fichas usam eles.',
        itemTitle: (t) => str(t.label),
        fields: [
          { key: 'label', label: 'Nome', kind: 'text', half: true },
          { key: 'id', label: 'ID', kind: 'text', half: true },
          { key: 'group', label: 'Grupo', kind: 'select', half: true, options: opts('humano', 'super', 'mega') },
          { key: 'general', label: 'Descrição geral', kind: 'textarea' },
          { key: 'restricted', label: 'Restrição', kind: 'text' },
        ],
      },
      {
        key: 'attributes',
        label: 'Atributos',
        kind: 'list',
        itemTitle: (a) => str(a.label),
        template: () => ({ id: '', label: '', descriptions: {} }),
        fields: [
          { key: 'label', label: 'Nome', kind: 'text', half: true },
          { key: 'id', label: 'ID', kind: 'text', half: true },
          { key: 'descriptions', label: 'Texto de cada nível', kind: 'dict', dictKeys: tiers },
        ],
      },
    ],
  },
];

export const sectionById = (id: string) => sections.find((s) => s.id === id);
export const groupsInOrder = ['Arquivo', 'Biblioteca', 'Mapa', 'Site'];

const fileLabel: Record<ContentFileId, string> = {
  characters: 'Personagens',
  earths: 'Terras',
  events: 'Linha do tempo',
  factions: 'Facções',
  news: 'Notícias',
  library: 'Biblioteca',
  fame: 'Hall da Fama',
  magic: 'Kamar-Taj',
  city: 'PYM-City',
  ascent: 'Ascent City',
  world: 'Explorar',
  site: 'Textos do site',
  status: 'Escala de status',
};
export const labelOfFile = (id: ContentFileId) => fileLabel[id];
