/**
 * Modelo de dados do Arquivo PYM.
 *
 * Cada coleção é um array de registros guardado em `src/content/<colecao>.json`.
 * O futuro painel administrativo vai criar, editar e remover exatamente estes
 * formatos — por isso as páginas nunca leem os arquivos diretamente, só pelo
 * repositório (`src/data/index.ts`).
 */

/** Campos comuns a todo registro do arquivo. */
export interface RecordBase {
  /** Identificador estável. Nunca muda depois de criado. */
  id: string;
  /** Usado na URL: /database/peter-parker */
  slug: string;
  name: string;
  /** Uma ou duas frases. Aparece em cartões e na busca. */
  summary?: string;
  /** Caminho relativo a /public (ex.: "uploads/peter.webp") ou URL completa. */
  image?: string;
  tags?: string[];
  /** ISO 8601. Preenchido pelo painel. */
  updatedAt?: string;
  /** Rascunhos ficam fora do site público. */
  draft?: boolean;
}

export type RecordStatus = 'ativo' | 'inativo' | 'desaparecido' | 'falecido' | 'desconhecido' | 'classificado';

/** Referência a outro registro pelo id. */
export type Ref = string;

/* ── Multiverso ─────────────────────────────────────────────── */

export type EarthStatus =
  | 'estável'
  | 'ameaçada'
  | 'instável'
  | 'unificada'
  | 'em colapso'
  | 'destruída'
  | 'isolada'
  | 'desconhecido';

/**
 * Nome de personagem, facção ou organização citado numa ficha.
 * Se for o id de um registro do arquivo (ex.: "kal-el"), vira link; senão aparece como texto.
 */
export type NameOrRef = string;

export interface EarthConnection {
  to: Ref;
  /** Texto curto sobre a ligação (ex.: "A Fenda, Temporada 11") */
  label?: string;
  /** Evento que criou a ligação */
  event?: Ref;
}

/** Tema visual do planeta no mapa do Multiverso. */
export type PlanetTheme = 'arquivo' | 'ultimate' | 'desconhecido' | 'brasa' | 'gelo' | 'vazio';

export interface Earth extends RecordBase {
  /** Ex.: "TERRA-001" */
  code: string;
  aliases?: string[];
  status: EarthStatus;
  /** Complemento do status (ex.: "Unificada à Terra-001 na Temporada 11") */
  statusNote?: string;
  /** Lore em parágrafos */
  lore?: string[];
  heroes?: NameOrRef[];
  villains?: NameOrRef[];
  organizations?: NameOrRef[];
  /** Conexões desenhadas no mapa do Multiverso. */
  connections?: EarthConnection[];
  /** Aparência do planeta no mapa. Posição em unidades do mapa (0,0 é o centro). */
  visual?: { theme?: PlanetTheme; size?: number; position?: [number, number]; seed?: number };
  /** Pares livres de "outras informações". */
  facts?: { label: string; value: string }[];
  /** A Terra possui mapa próprio publicado? */
  hasMap?: boolean;
  /** Nome do mapa principal (ex.: "PYM-City"). */
  mapName?: string;
}

/* ── Personagens ─────────────────────────────────────────────── */

export type Alignment = 'herói' | 'vilão' | 'anti-herói' | 'neutro';

/**
 * Escala oficial de status do PYM, em ordem crescente.
 * É uma escala de NÍVEIS, não de porcentagens somáveis (ver src/content/status.json).
 */
export type StatusTier =
  | 'humano'
  | 'atletico'
  | 'sobre-humano'
  | 'super'
  | 'super+'
  | 'super++'
  | 'super+++'
  | 'mega'
  | 'mega+';

/** Atributos com nome fixo; outros podem ser criados pela staff com qualquer id. */
export type StatusAttribute = 'forca' | 'velocidade' | 'durabilidade' | 'resistencia' | (string & {});

export interface CharacterStat {
  attribute: StatusAttribute;
  tier: StatusTier;
  /** Observação curta (ex.: "com a armadura") */
  note?: string;
}

/** Poder ou habilidade. Pode ter sub-itens (ex.: Super-Visão → Visão de raio-X). */
export interface Trait {
  name: string;
  details?: Trait[];
}

export interface Relation {
  name: string;
  /** Liga a um registro do arquivo, quando existir (id de personagem ou facção). */
  ref?: Ref;
  kind?: 'pessoa' | 'organização';
  /** Papel ou vínculo (ex.: "CEO/Fundador", "Colega de trabalho") */
  role?: string;
}

export interface FameEntry {
  /** Onde a fama vale (planeta, cidade, meio) */
  place: string;
  /** 0 a 10 */
  score: number;
  /** Sob qual identidade, quando o personagem tem mais de uma */
  as?: string;
  note?: string;
}

export interface Character extends RecordBase {
  /** Código do registro no arquivo (ex.: "DB-0001") */
  code?: string;
  /** Nome de herói/vilão. É o título da ficha. */
  codename?: string;
  /** Demais apelidos */
  aliases?: string[];
  /** Identidade civil, quando difere do nome (ex.: Kal-El → Clark Kent) */
  identity?: string;
  /** Campo "Descrição" da ficha do servidor */
  description?: string;
  age?: string;
  height?: string;
  weight?: string;
  gender?: string;
  sexuality?: string;
  race?: string;
  alignment: Alignment;
  /** Complemento do lado (ex.: "Super-herói otimista e bondoso") */
  alignmentNote?: string;
  status: RecordStatus;
  earth: Ref;
  factions?: Ref[];
  history?: string;
  powers?: Trait[];
  abilities?: Trait[];
  weaknesses?: string[];
  rivals?: string[];
  relations?: Relation[];
  fame?: FameEntry[];
  stats?: CharacterStat[];
  personality?: string[];
  equipment?: string[];
  /** Jogador responsável pelo personagem no Discord. */
  player?: string;
  gallery?: { src: string; caption?: string }[];
  facts?: { label: string; value: string }[];
}

/* ── Facções ────────────────────────────────────────────────── */

export interface Faction extends RecordBase {
  /** Sigla curta usada no brasão gerado (ex.: "SHIELD"). */
  acronym?: string;
  /** Tipo de organização (ex.: "Agência internacional", "Organização terrorista") */
  classification?: string;
  motto?: string;
  /** Logo oficial (caminho em /public). Sem ele, o site gera um brasão. */
  logo?: string;
  /** Cor de destaque da facção (hex) */
  color?: string;
  /** Texto da facção; aceita os mesmos blocos da lore */
  body?: LoreBlock[];
  goals?: string[];
  /** Personagens do Database (ids) que pertencem à facção. Personagens com `factions` também entram. */
  members?: Ref[];
  /** Líderes: id de personagem ou nome */
  leaders?: NameOrRef[];
  /** Outras figuras conhecidas: id de personagem ou nome */
  figures?: NameOrRef[];
  bases?: string[];
  earth?: Ref;
  /** Ids de facções ou nomes */
  allies?: NameOrRef[];
  enemies?: NameOrRef[];
  /** Eventos da linha do tempo (ids) */
  events?: Ref[];
  /** Verbetes da Biblioteca ligados (ids) */
  related?: Ref[];
  facts?: { label: string; value: string }[];
}

/* ── Eventos e linha do tempo ───────────────────────────────── */

/** "perdido" marca um trecho da história cujas lores não foram recuperadas. */
export type EventKind = 'temporada' | 'arco' | 'guerra' | 'evento' | 'histórico' | 'perdido';

/** Um parágrafo da lore. `speaker` transforma o parágrafo em fala. */
export type LoreBlock = string | { speaker: string; text: string } | { heading: string };

export interface TimelineEvent extends RecordBase {
  kind: EventKind;
  /** Data da cronologia interna, como exibida (ex.: "01/01/2026", "Há seis décadas"). */
  date?: string;
  /** Ex.: "Temporada 11" */
  season?: string;
  /** Ex.: "Time-skip de 2 meses" */
  timeskip?: string;
  /** Frase de abertura do capítulo */
  tagline?: string;
  /** Evento em andamento no RP */
  current?: boolean;
  earths?: Ref[];
  /** Nomes ou ids de personagens envolvidos */
  characters?: NameOrRef[];
  factions?: Ref[];
  locations?: Ref[];
  /** Marcos dentro do capítulo */
  milestones?: { date?: string; label: string }[];
  body?: LoreBlock[];
  /** Ordem na linha do tempo (crescente). */
  order: number;
}

/* ── Notícias ───────────────────────────────────────────────── */

export interface NewsPost extends RecordBase {
  publishedAt: string;
  author?: string;
  body: string;
  related?: Ref[];
}

/* ── Biblioteca (wiki) ──────────────────────────────────────── */

export type LibraryCategory =
  | 'artefatos'
  | 'raças'
  | 'pactos'
  | 'tropas'
  | 'simbiontes'
  | 'magias'
  | 'tecnologias'
  | 'dimensões';

export interface LibraryEntry extends RecordBase {
  category: LibraryCategory;
  /** Subtipo livre (ex.: "Pacto", "Maldição", "Força cósmica") */
  group?: string;
  /** Texto completo do verbete; aceita os mesmos blocos da lore. */
  body?: LoreBlock[];
  /** Pares livres de dados (ex.: "Origem", "Portador") */
  facts?: { label: string; value: string }[];
  earths?: Ref[];
  /** Ids de outros registros (personagens, eventos, Terras, verbetes) ou "kamar-taj" */
  related?: Ref[];
  /** Verbete sem texto oficial ainda */
  pending?: boolean;
}

/* ── Hall da Fama ───────────────────────────────────────────── */

export interface HallOfFameEntry extends RecordBase {
  /** Categoria livre (ex.: "Jogador", "Narrador", "Staff") */
  category?: string;
  /** Motivo da homenagem. */
  reason: string;
  description?: string;
  /** Período ou temporada da homenagem. */
  period?: string;
  /** Personagem do Database ligado à homenagem */
  character?: Ref;
  /** Estrela da constelação ocupada (0 a 13). Sem valor, ocupa a próxima livre. */
  star?: number;
}

/* ── Mapa de coleções ───────────────────────────────────────── */

export interface Collections {
  earths: Earth;
  characters: Character;
  factions: Faction;
  events: TimelineEvent;
  news: NewsPost;
  library: LibraryEntry;
  fame: HallOfFameEntry;
}

export type CollectionName = keyof Collections;
