import type { LoreBlock, NameOrRef } from './types';

/**
 * Mapa de PYM-City e modo Explorar.
 *
 * Conteúdo em `src/content/city.json` (a cidade) e `src/content/world.json` (o mundo).
 * Nomes, textos, fotos e posições ficam todos no JSON: o painel administrativo edita
 * estes formatos sem tocar no código. Coordenadas da cidade usam uma prancheta de
 * 1600 × 1000 unidades (0,0 no canto superior esquerdo).
 */

/** Ponto na prancheta da cidade: [x, y]. */
export type Pt = [number, number];

/**
 * Camadas de uma cidade. PYM-City tem 'superior', 'cidade', 'inferioridade' e 'campos'
 * (do outro lado do túnel); Ascent City tem só 'cidade'.
 */
export type CityLayerId = 'superior' | 'cidade' | 'inferioridade' | 'campos' | (string & {});

/** Desenho de fundo de cada cidade (litoral, malha, decoração). */
export type CityLayout = 'pym' | 'ascent';

export interface Fact {
  label: string;
  value: string;
}

export interface CityLayer {
  id: CityLayerId;
  /** Ex.: "Cidade Superior" */
  name: string;
  /** Nome curto para o seletor de níveis no celular. */
  short?: string;
  /** Ex.: "NÍVEL +1" */
  level: string;
  tagline?: string;
  summary: string;
  body?: LoreBlock[];
  /** Quem manda na camada (id de personagem ou nome). */
  ruler?: NameOrRef;
  rulerLabel?: string;
  images?: string[];
  facts?: Fact[];
}

/** Tom de cor de uma área no mapa. */
export type AreaTone = 'neutro' | 'vermelho' | 'verde' | 'ouro' | 'areia' | 'sombra' | 'tecnologia' | 'agua';

interface CityRecord {
  /** Identificador estável. Nunca muda. */
  id: string;
  /** Usado na URL: /mapa?local=<slug> */
  slug: string;
  name: string;
  layer: CityLayerId;
  /** Ex.: "Bairro", "Bar", "Delegacia", "Avenida" */
  kind: string;
  summary?: string;
  body?: LoreBlock[];
  facts?: Fact[];
  /** Fotos (caminho em /public ou URL). */
  images?: string[];
  /** Registros do arquivo ligados a este (personagens, eventos, facções, verbetes). */
  related?: NameOrRef[];
  /** Esconde do site público. */
  draft?: boolean;
}

/** Bairro, parque, plataforma: uma área desenhada no mapa. */
export interface CityDistrict extends CityRecord {
  shape: Pt[];
  tone?: AreaTone;
  /** Onde o nome aparece (padrão: centro da área). */
  labelAt?: Pt;
  /** Quem manda no bairro (id de personagem ou nome). */
  ruler?: NameOrRef;
}

export type StreetKind = 'rua' | 'avenida' | 'via elevada' | 'túnel' | 'estrada' | 'galeria' | 'beco' | 'trilha' | 'ponte';

/** Rua, avenida, via elevada ou galeria de esgoto: uma linha no mapa. */
export interface CityStreet extends CityRecord {
  kind: StreetKind;
  path: Pt[];
  /** Ruas canônicas ganham destaque e nome sempre visível. */
  canonical?: boolean;
}

/** Prédio, bar, delegacia, portal: um ponto no mapa. */
export interface CityPlace extends CityRecord {
  at: Pt;
  district?: string;
  /** Dono ou responsável (id de personagem ou nome). */
  owner?: NameOrRef;
  ownerLabel?: string;
  /** Leva a outra camada (túnel, bueiro, elevador). */
  leadsTo?: CityLayerId;
  /** Leva a outra cidade (id da cidade, ex.: "ascent"). */
  leadsToCity?: string;
  /** Ícone do marcador. */
  icon?: 'ponto' | 'torre' | 'bar' | 'portal' | 'acesso' | 'escudo' | 'antena' | 'portao' | 'cruz' | 'onda';
}

export interface CityFact {
  title: string;
  text: string;
  /** Local do mapa (slug) ou registro do arquivo (id) para abrir. */
  local?: string;
  ref?: string;
}

export interface CityContent {
  /** Identificador da cidade ("pym-city", "ascent") */
  id: string;
  /** Endereço no mapa: /mapa (vazio) ou /mapa/<slug> */
  slug: string;
  layout: CityLayout;
  name: string;
  code: string;
  earth: string;
  tagline: string;
  summary: string;
  layers: CityLayer[];
  districts: CityDistrict[];
  streets: CityStreet[];
  places: CityPlace[];
  facts: CityFact[];
}

export type CityEntity =
  | { type: 'district'; record: CityDistrict }
  | { type: 'street'; record: CityStreet }
  | { type: 'place'; record: CityPlace }
  | { type: 'layer'; record: CityLayer };

/* ── Modo Explorar ───────────────────────────────────────────── */

export interface Realm {
  id: string;
  slug: string;
  name: string;
  /** Ex.: "Reino", "Nação", "Ilha-nação", "Cidade" */
  kind: string;
  /** Região exibida (ex.: "África Oriental") */
  region: string;
  /** [longitude, latitude] */
  coords: [number, number];
  summary: string;
  body?: LoreBlock[];
  ruler?: NameOrRef;
  capital?: string;
  facts?: Fact[];
  images?: string[];
  related?: NameOrRef[];
  /** Link interno extra (ex.: "/mapa" para PYM-City, "/biblioteca/kamar-taj"). */
  link?: { href: string; label: string };
  /** Texto de referência dos quadrinhos, ainda sem lore própria do PYM. */
  reference?: boolean;
  /** Lado do nome no mapa, para não encavalar com vizinhos (padrão: direita). */
  labelSide?: 'left' | 'right' | 'below';
  draft?: boolean;
}

export interface WorldContent {
  name: string;
  earth: string;
  summary: string;
  realms: Realm[];
}
