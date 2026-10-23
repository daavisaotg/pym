import type { LoreBlock } from './types';

/**
 * Sistema de magia e a ala de Kamar-Taj da Biblioteca.
 * Conteúdo em `src/content/magic.json`.
 */

export type Grade = 'aprendiz' | 'adepto' | 'mathet' | 'grao-mestre';

export interface GradeInfo {
  id: Grade;
  label: string;
  /** Texto curto sobre o grau */
  text?: string;
}

/** Página de um livro do acervo. */
export type BookPage =
  /** Abertura ou texto corrido do livro */
  | { type: 'texto'; title?: string; blocks: LoreBlock[]; facts?: { label: string; value: string }[]; restored?: boolean }
  /** Capítulo ou trecho que ensina um feitiço */
  | {
      type: 'feitiço';
      /** Ex.: "Capítulo 03", "Trecho 08" */
      label: string;
      title: string;
      quote?: string;
      spell: string;
      description: string;
      mana: string;
      /** Ilustração opcional (caminho em /public ou URL) */
      image?: string;
      /** Página reconstituída a partir dos registros dos quadrinhos, aguardando revisão da staff */
      restored?: boolean;
    }
  /** Página arrancada: só sobra a margem rasgada */
  | { type: 'rasgada'; label?: string; note?: string }
  /** Página borrada: o texto existe, mas está ilegível */
  | { type: 'borrada'; label?: string; note?: string };

export interface Book {
  id: string;
  title: string;
  /** Ex.: "Grimório", "Manuscritos", "Pergaminhos", "Tomo", "Códice" */
  kind: string;
  /** Prateleira onde o livro fica. "universal" fica no púlpito. */
  shelf: Grade | 'universal';
  /** Classificação escrita no próprio livro, quando difere da prateleira */
  classification?: string;
  summary?: string;
  /** Livros com páginas recuperadas brilham e podem ser folheados. */
  pages?: BookPage[];
  /** Cor da lombada (opcional) */
  color?: string;
}

export interface KitItem {
  name: string;
  text: string;
  effect?: string;
}

export interface ManaActivity {
  name: string;
  text: string;
  mana: number;
  /** Corrupção mística, em % (só nos métodos corrompidos) */
  corruption?: number;
}

export interface MagicContent {
  school: {
    name: string;
    location: string;
    intro: string;
    protocol: string;
    dimensions: string;
    restrictions: string[];
  };
  library: { paragraphs: string[]; credit: string };
  kit: { intro: string; items: KitItem[] };
  system: {
    grades: GradeInfo[];
    howItWorks: string[];
    universal: string[];
    growth: string[];
    methods: { name: string; text: string }[];
    evolutionSystem: string[];
    natural: ManaActivity[];
    limits: string[];
    paths: { name: string; text: string; pros: string[]; cons: string[] }[];
    note: string[];
    corrupted: ManaActivity[];
    corruptedNote: string[];
  };
  books: Book[];
}
